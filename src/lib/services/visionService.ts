import { analyzeFoodPhoto, isVisionConfigured } from "../providers/anthropicVision";
import { prisma } from "../db";
import { resolveFoodByName } from "./foodService";
import type { PhotoAnalysis, PhotoCandidate, Result } from "../types";
import { err, ok } from "../types";

/**
 * VisionService — photo in, *candidate* foods out.
 *
 * The model is used only to name what's on the plate and guess a portion. All
 * nutrition numbers come from the food database afterwards, so we never present
 * a hallucinated macro as fact. Everything downstream is labelled an estimate
 * and is editable by the user before it is saved.
 */

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function visionAvailable(): boolean {
  return isVisionConfigured();
}

export interface AnalyzeResult extends PhotoAnalysis {
  /** Candidates enriched with nutrition from the food database. */
  candidates: PhotoCandidate[];
}

export async function analyzePhoto(
  userId: string,
  base64: string,
  mediaType: string,
): Promise<Result<AnalyzeResult>> {
  if (!ALLOWED_TYPES.has(mediaType)) {
    return err("invalid_input", "That image format isn't supported.", "Use a JPEG, PNG or WebP photo.");
  }
  // base64 inflates by ~4/3; check the decoded size.
  if ((base64.length * 3) / 4 > MAX_BYTES) {
    return err("invalid_input", "That photo is too large.", "Try a smaller photo — around 2 MB works well.");
  }

  const analysis = await analyzeFoodPhoto(base64, mediaType);

  if (!analysis.ok) {
    await recordScan(userId, false, analysis.error.message, null);
    // Degrade rather than fail: the UI opens manual entry with the same shape.
    return ok({
      ok: false,
      provider: "unavailable",
      candidates: [],
      needsManualEntry: true,
      message: analysis.error.message,
      mealNameGuess: null,
    });
  }

  // Attach real nutrition to each candidate from the database.
  const enriched: PhotoCandidate[] = [];
  for (const candidate of analysis.data.candidates) {
    const match = await resolveFoodByName(userId, candidate.name);
    enriched.push({
      ...candidate,
      per100: match?.per100 ?? null,
      matchedFoodName: match?.name ?? null,
      // If we can't price the food, say so by lowering confidence rather than
      // guessing numbers.
      confidence: match ? candidate.confidence : Math.min(candidate.confidence, 0.4),
    });
  }

  await recordScan(userId, true, analysis.data.message ?? "Photo analysed", enriched);

  const unmatched = enriched.filter((c) => !c.per100).length;
  return ok({
    ...analysis.data,
    candidates: enriched,
    needsManualEntry: enriched.length === 0,
    message:
      analysis.data.message ??
      (unmatched > 0
        ? `${unmatched} item${unmatched === 1 ? "" : "s"} had no nutrition match — search for ${unmatched === 1 ? "it" : "them"} or edit the entry before saving.`
        : null),
  });
}

async function recordScan(
  userId: string,
  succeeded: boolean,
  message: string,
  candidates: PhotoCandidate[] | null,
) {
  try {
    await prisma.foodScan.create({
      data: {
        userId,
        kind: "photo",
        provider: "anthropic",
        succeeded,
        message,
        // The image itself is never persisted; only the candidate names are.
        resultJson: candidates ? JSON.stringify(candidates) : null,
      },
    });
  } catch (e) {
    console.error("[vision] failed to record scan", e);
  }
}
