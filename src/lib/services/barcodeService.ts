import { prisma } from "../db";
import { lookupBarcode } from "../providers/openFoodFacts";
import { searchLocalFoods } from "../providers/localFoodProvider";
import { rowQuality } from "./foodService";
import type { FoodResult, Result } from "../types";
import { err, ok } from "../types";

/**
 * BarcodeService — turns a scanned code into a food.
 *
 * Handles both plain product barcodes (EAN/UPC) and QR codes, which may embed
 * a URL or a small JSON payload rather than a GTIN.
 */

export interface DecodedCode {
  kind: "barcode" | "qr";
  /** The GTIN we should look up, if we could find one. */
  gtin: string | null;
  /** Anything human-readable we extracted from a QR payload. */
  productHint: string | null;
  raw: string;
}

/**
 * Normalise a raw scanner value.
 *
 * QR codes in the wild carry: a bare GTIN, a product URL (Open Food Facts and
 * many retailers put the barcode in the path), GS1 Digital Link, or JSON.
 */
export function decodeScanValue(raw: string, format?: string): DecodedCode {
  const value = raw.trim();
  const isQr = (format ?? "").toLowerCase().includes("qr");

  // A bare numeric code is a GTIN.
  if (/^\d{6,14}$/.test(value)) {
    return { kind: isQr ? "qr" : "barcode", gtin: value, productHint: null, raw: value };
  }

  // GS1 Digital Link / product URLs: .../01/09506000134352 or /product/737628064502
  const urlMatch = value.match(/\/(?:01|product|products|p)\/(\d{8,14})/);
  if (urlMatch) {
    return { kind: "qr", gtin: urlMatch[1], productHint: null, raw: value };
  }

  // GS1 element string: (01)09506000134352
  const gs1 = value.match(/\(01\)(\d{14})/);
  if (gs1) return { kind: "qr", gtin: gs1[1], productHint: null, raw: value };

  // JSON payloads used by some in-house labels.
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      const gtin = parsed.gtin ?? parsed.barcode ?? parsed.ean ?? parsed.upc ?? null;
      const name = parsed.name ?? parsed.product ?? parsed.title ?? null;
      return {
        kind: "qr",
        gtin: gtin ? String(gtin).replace(/\D/g, "") : null,
        productHint: name ? String(name) : null,
        raw: value,
      };
    } catch {
      // fall through
    }
  }

  // Any long digit run inside the payload is a plausible GTIN.
  const loose = value.match(/\b(\d{8,14})\b/);
  if (loose) return { kind: "qr", gtin: loose[1], productHint: null, raw: value };

  // Otherwise treat the whole payload as a search hint.
  return { kind: isQr ? "qr" : "barcode", gtin: null, productHint: value.slice(0, 80), raw: value };
}

export interface ScanOutcome {
  decoded: DecodedCode;
  food: FoodResult | null;
  /** Fallback suggestions when the code itself didn't resolve. */
  suggestions: FoodResult[];
  message: string | null;
  hint: string | null;
}

/**
 * Look a scanned code up and record the attempt.
 * Never throws: an unrecognised code is a normal outcome with a manual path.
 */
export async function resolveScan(
  userId: string,
  raw: string,
  format?: string,
): Promise<Result<ScanOutcome>> {
  const decoded = decodeScanValue(raw, format);

  if (!decoded.gtin && !decoded.productHint) {
    await recordScan(userId, decoded, false, "Unreadable code");
    return err(
      "invalid_input",
      "That code didn't contain anything we could look up.",
      "Try scanning again with the barcode filling more of the frame, or search for the product by name.",
    );
  }

  // 1. Anything already saved locally with this barcode wins — instant, offline.
  if (decoded.gtin) {
    const saved = await prisma.food.findFirst({
      where: { barcode: decoded.gtin },
      include: { nutrition: true },
    });
    if (saved?.nutrition) {
      const food: FoodResult = {
        id: saved.id,
        name: saved.name,
        brand: saved.brand,
        barcode: saved.barcode,
        source: saved.source as FoodResult["source"],
        sourceId: saved.sourceId,
        per100: {
          calories: saved.nutrition.calories,
          protein: saved.nutrition.protein,
          carbs: saved.nutrition.carbs,
          fat: saved.nutrition.fat,
          fiber: saved.nutrition.fiber,
          sugar: saved.nutrition.sugar,
          satFat: saved.nutrition.satFat,
          sodium: saved.nutrition.sodium,
        },
        servingLabel: saved.servingLabel,
        servingGrams: saved.servingGrams,
        // A product scanned before keeps its ratings, with no network needed.
        quality: rowQuality(saved),
      };
      await recordScan(userId, decoded, true, "Matched a food you've logged before", food);
      return ok({ decoded, food, suggestions: [], message: null, hint: null });
    }

    // 2. Remote product database.
    const remote = await lookupBarcode(decoded.gtin);
    if (remote.ok) {
      await recordScan(userId, decoded, true, "Matched in the product database", remote.data);
      return ok({ decoded, food: remote.data, suggestions: [], message: null, hint: null });
    }

    // 3. Not found or offline — offer name-based fallbacks, never a dead end.
    const suggestions = decoded.productHint ? searchLocalFoods(decoded.productHint, 5) : [];
    await recordScan(userId, decoded, false, remote.error.message);
    return ok({
      decoded,
      food: null,
      suggestions,
      message: remote.error.message,
      hint: remote.error.hint ?? "Search for it by name, or enter the nutrition from the label.",
    });
  }

  // QR payload with only a product name: search by that name.
  const suggestions = searchLocalFoods(decoded.productHint!, 5);
  await recordScan(userId, decoded, suggestions.length > 0, "QR text search");
  return ok({
    decoded,
    food: null,
    suggestions,
    message:
      decoded.kind === "qr"
        ? `That QR code says "${decoded.productHint}" — there's no barcode in it.`
        : `We read "${decoded.productHint}", but that isn't a product barcode.`,
    hint: suggestions.length
      ? "Pick a match below, or search for something else."
      : "Search for the product by name, or enter the nutrition yourself.",
  });
}

async function recordScan(
  userId: string,
  decoded: DecodedCode,
  succeeded: boolean,
  message: string,
  food?: FoodResult,
) {
  try {
    await prisma.foodScan.create({
      data: {
        userId,
        kind: decoded.kind,
        rawValue: decoded.raw.slice(0, 500),
        provider: food?.source ?? "openfoodfacts",
        succeeded,
        message,
        resultJson: food ? JSON.stringify(food) : null,
      },
    });
  } catch (e) {
    // Scan history is a convenience, never a reason to fail the user's action.
    console.error("[barcode] failed to record scan", e);
  }
}
