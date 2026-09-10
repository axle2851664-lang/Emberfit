import type { PhotoAnalysis, PhotoCandidate, Result } from "../types";
import { err, ok } from "../types";
import { clamp } from "../utils";

/**
 * Food-photo recognition via the Anthropic Messages API.
 *
 * This module only ever runs on the server: the API key is read from the
 * environment and never reaches the browser. If no key is configured the
 * caller degrades to manual entry rather than inventing numbers.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 45_000;

export function isVisionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You identify foods in photographs for a nutrition journal.

Rules:
- Identify each distinct food or ingredient you can see. Prefer the ingredient level ("white rice", "grilled chicken thigh", "steamed broccoli") over a dish name, because the app estimates nutrition by summing ingredients.
- Portions from a photo are guesses. Give your best gram estimate and be honest in the confidence score.
- confidence is 0..1: above 0.75 only when the food is unmistakable; below 0.5 when you are unsure.
- Never invent nutrition numbers. Only name the food, the visible preparation, and an estimated weight.
- If the image does not show food, return an empty items array.

Respond with JSON only, no prose, in exactly this shape:
{"mealName": "short descriptive name", "items": [{"name": "food name", "estimatedGrams": 120, "confidence": 0.8, "preparation": "grilled"}]}`;

interface VisionItem {
  name?: unknown;
  estimatedGrams?: unknown;
  confidence?: unknown;
  preparation?: unknown;
}

function coerceCandidates(raw: unknown): PhotoCandidate[] {
  if (!Array.isArray(raw)) return [];
  const out: PhotoCandidate[] = [];
  for (const entry of raw as VisionItem[]) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const grams = Number(entry?.estimatedGrams);
    const confidence = Number(entry?.confidence);
    out.push({
      name,
      estimatedGrams: Number.isFinite(grams) && grams > 0 ? clamp(Math.round(grams), 1, 2000) : 100,
      confidence: Number.isFinite(confidence) ? clamp(confidence, 0, 1) : 0.5,
      preparation: typeof entry?.preparation === "string" ? entry.preparation : null,
    });
  }
  return out.slice(0, 12);
}

/** Pull the first JSON object out of a model response that may be fenced. */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: string,
): Promise<Result<PhotoAnalysis>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return err(
      "not_configured",
      "Photo recognition isn't set up on this server.",
      "Add ANTHROPIC_API_KEY to your environment, or enter the ingredients yourself — it only takes a moment.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_VISION_MODEL || "claude-opus-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
              { type: "text", text: "What foods are in this photo? Respond with JSON only." },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) {
      return err("rate_limited", "Photo recognition is rate limited right now.", "Wait a moment and try again, or enter the ingredients yourself.");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // Never surface raw provider payloads (they can echo the key back).
      console.error("[vision] provider error", res.status, detail.slice(0, 300));
      return err("provider_error", "Photo recognition failed.", "You can enter the ingredients manually instead.");
    }

    const body = await res.json();
    const text: string = (body?.content ?? [])
      .filter((block: any) => block?.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    const parsed = extractJson(text) as { mealName?: unknown; items?: unknown } | null;
    if (!parsed) {
      return err("provider_error", "Couldn't read the recognition result.", "Try another photo, or enter the ingredients manually.");
    }

    const candidates = coerceCandidates(parsed.items);
    return ok({
      ok: true,
      provider: "anthropic",
      mealNameGuess: typeof parsed.mealName === "string" ? parsed.mealName : null,
      candidates,
      needsManualEntry: candidates.length === 0,
      message:
        candidates.length === 0
          ? "No food was recognised in that photo. Try a clearer, closer shot — or add the ingredients yourself."
          : null,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return err(
      aborted ? "provider_error" : "offline",
      aborted ? "Photo recognition timed out." : "Couldn't reach the recognition service.",
      "Enter the ingredients yourself — the estimate is usually better that way anyway.",
    );
  } finally {
    clearTimeout(timer);
  }
}
