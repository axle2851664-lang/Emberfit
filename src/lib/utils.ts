import type { Nutrients } from "./types";
import { EMPTY_NUTRIENTS } from "./types";

/** Tailwind-friendly class joiner. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyList(values: readonly string[] | undefined): string {
  return JSON.stringify(Array.from(new Set(values ?? [])));
}

/** Local calendar day key (YYYY-MM-DD) for a Date, in the runtime's zone. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / 86_400_000);
}

export function formatDayLabel(key: string): string {
  const today = dayKey();
  if (key === today) return "Today";
  if (key === dayKey(addDays(new Date(), -1))) return "Yesterday";
  return dayKeyToDate(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function round(value: number, places = 0): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Scale per-100 g values to an arbitrary gram amount. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const scale = (v: number | null | undefined) =>
    v == null ? null : round(v * f, 1);
  return {
    calories: round(per100.calories * f, 0),
    protein: round(per100.protein * f, 1),
    carbs: round(per100.carbs * f, 1),
    fat: round(per100.fat * f, 1),
    fiber: scale(per100.fiber),
    sugar: scale(per100.sugar),
    satFat: scale(per100.satFat),
    sodium: per100.sodium == null ? null : round(per100.sodium * f, 0),
  };
}

export function sumNutrients(items: Array<Partial<Nutrients>>): Nutrients {
  const total = { ...EMPTY_NUTRIENTS };
  for (const item of items) {
    total.calories += item.calories ?? 0;
    total.protein += item.protein ?? 0;
    total.carbs += item.carbs ?? 0;
    total.fat += item.fat ?? 0;
    total.fiber = (total.fiber ?? 0) + (item.fiber ?? 0);
    total.sugar = (total.sugar ?? 0) + (item.sugar ?? 0);
    total.satFat = (total.satFat ?? 0) + (item.satFat ?? 0);
    total.sodium = (total.sodium ?? 0) + (item.sodium ?? 0);
  }
  return {
    calories: round(total.calories, 0),
    protein: round(total.protein, 1),
    carbs: round(total.carbs, 1),
    fat: round(total.fat, 1),
    fiber: round(total.fiber ?? 0, 1),
    sugar: round(total.sugar ?? 0, 1),
    satFat: round(total.satFat ?? 0, 1),
    sodium: round(total.sodium ?? 0, 0),
  };
}

/**
 * Convert a user-entered amount into grams.
 * Volume units are approximated with water-like density; that imprecision is
 * why every derived value in the app is labelled an estimate.
 */
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  oz: 28.35,
  lb: 453.6,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  slice: 30,
  piece: 60,
  handful: 30,
  serving: 100,
};

export const AMOUNT_UNITS = Object.keys(UNIT_GRAMS);

export function toGrams(quantity: number, unit: string, servingGrams?: number | null): number {
  const key = unit.trim().toLowerCase();
  if (key === "serving" && servingGrams) return round(quantity * servingGrams, 1);
  const factor = UNIT_GRAMS[key] ?? 1;
  return round(quantity * factor, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function titleCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
