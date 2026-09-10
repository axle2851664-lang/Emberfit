import type { FoodResult, Nutrients, Result } from "../types";
import { err, ok } from "../types";

/**
 * Open Food Facts adapter.
 *
 * Chosen because it is open, keyless and covers packaged goods worldwide. It is
 * isolated behind this module so swapping in another provider (Nutritionix,
 * FatSecret, USDA FDC) only means writing a new adapter with the same two
 * functions.
 */

const BASE = "https://world.openfoodfacts.org";
const TIMEOUT_MS = 7000;

function userAgent(): string {
  return process.env.OPEN_FOOD_FACTS_USER_AGENT || "EmberFit/1.0 (self-hosted)";
}

function remoteEnabled(): boolean {
  return process.env.ENABLE_REMOTE_FOOD_LOOKUP !== "0";
}

async function fetchJson(url: string): Promise<Result<any>> {
  if (!remoteEnabled()) {
    return err("not_configured", "Remote food lookup is turned off.", "Search the built-in food list instead.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 429) {
      return err("rate_limited", "The food database is busy right now.", "Try again in a moment or search the built-in list.");
    }
    if (!res.ok) {
      return err("provider_error", `Food database returned ${res.status}.`, "You can still search the built-in list or enter the food manually.");
    }
    return ok(await res.json());
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return err(
      "offline",
      aborted ? "The food database took too long to answer." : "Couldn't reach the food database.",
      "Check your connection — the built-in food list and manual entry still work.",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Open Food Facts stores nutriments per 100 g under predictable keys. */
function toNutrients(n: Record<string, unknown>): Nutrients | null {
  const num = (key: string): number | null => {
    const v = n[key];
    const parsed = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Energy may only be present in kJ.
  let calories = num("energy-kcal_100g");
  if (calories == null) {
    const kj = num("energy-kj_100g") ?? num("energy_100g");
    if (kj != null) calories = Math.round(kj / 4.184);
  }
  const protein = num("proteins_100g");
  const carbs = num("carbohydrates_100g");
  const fat = num("fat_100g");

  // Without any macro at all the record is not worth showing.
  if (calories == null && protein == null && carbs == null && fat == null) return null;

  return {
    calories: calories ?? 0,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
    fiber: num("fiber_100g"),
    sugar: num("sugars_100g"),
    satFat: num("saturated-fat_100g"),
    // Open Food Facts reports sodium in grams; we store milligrams.
    sodium: num("sodium_100g") != null ? Math.round((num("sodium_100g") as number) * 1000) : null,
  };
}

function toFoodResult(product: any): FoodResult | null {
  const per100 = toNutrients(product?.nutriments ?? {});
  if (!per100) return null;
  const name: string =
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    product.abbreviated_product_name ||
    "";
  if (!name.trim()) return null;

  const servingGrams = Number.parseFloat(product.serving_quantity);

  return {
    name: name.trim(),
    brand: product.brands ? String(product.brands).split(",")[0].trim() : null,
    barcode: product.code ? String(product.code) : null,
    source: "openfoodfacts",
    sourceId: product.code ? String(product.code) : null,
    per100,
    servingLabel: product.serving_size || null,
    servingGrams: Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : null,
  };
}

export async function lookupBarcode(barcode: string): Promise<Result<FoodResult>> {
  const clean = barcode.replace(/\D/g, "");
  if (clean.length < 6 || clean.length > 14) {
    return err("invalid_input", "That doesn't look like a product barcode.", "Try scanning again, or search for the product by name.");
  }

  const res = await fetchJson(
    `${BASE}/api/v2/product/${clean}.json?fields=code,product_name,product_name_en,generic_name,brands,serving_size,serving_quantity,nutriments`,
  );
  if (!res.ok) return res as Result<FoodResult>;

  const body = res.data;
  if (body?.status !== 1 || !body?.product) {
    return err("not_found", `No product found for barcode ${clean}.`, "Search by name instead, or add the nutrition from the label yourself.");
  }

  const food = toFoodResult(body.product);
  if (!food) {
    return err("not_found", "That product has no nutrition information on file.", "You can type the values from the label — it takes a moment and helps next time.");
  }
  return ok({ ...food, barcode: clean });
}

export async function searchProducts(query: string, limit = 15): Promise<Result<FoodResult[]>> {
  const q = query.trim();
  if (!q) return ok([]);

  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}` +
    `&fields=code,product_name,product_name_en,generic_name,brands,serving_size,serving_quantity,nutriments`;

  const res = await fetchJson(url);
  if (!res.ok) return res as Result<FoodResult[]>;

  const products: any[] = Array.isArray(res.data?.products) ? res.data.products : [];
  const mapped = products.map(toFoodResult).filter((p): p is FoodResult => p !== null);
  return ok(mapped);
}
