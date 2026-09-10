import { COOKING_ADJUSTMENTS } from "../data/foodTable";
import type { DraftItem, Nutrients } from "../types";
import { round, scaleNutrients, sumNutrients } from "../utils";

/**
 * Pure nutrition maths. No I/O, no database — everything here is deterministic
 * and unit-testable, which keeps the estimate logic honest and reviewable.
 */

/** Absolute nutrients for one draft line. */
export function itemNutrients(item: DraftItem): Nutrients {
  return scaleNutrients(item.per100, item.grams);
}

/** Total for a list of draft lines. */
export function totalNutrients(items: DraftItem[]): Nutrients {
  return sumNutrients(items.map(itemNutrients));
}

/**
 * Apply a cooking method to a set of ingredients.
 *
 * Cooking is modelled as fat absorbed by the food, scaled to the cooked weight.
 * Water loss is deliberately *not* modelled: it changes nutrients per gram but
 * not the total the person eats, which is what we report.
 */
export function applyCookingMethod(base: Nutrients, totalGrams: number, method?: string | null): {
  nutrients: Nutrients;
  note: string | null;
} {
  if (!method || method === "raw") return { nutrients: base, note: null };

  const adjustment = COOKING_ADJUSTMENTS[method];
  if (!adjustment || adjustment.addedFatGramsPer100 === 0) {
    return { nutrients: base, note: null };
  }

  const addedFat = round((adjustment.addedFatGramsPer100 * totalGrams) / 100, 1);
  if (addedFat <= 0) return { nutrients: base, note: null };

  return {
    nutrients: {
      ...base,
      fat: round(base.fat + addedFat, 1),
      satFat: base.satFat == null ? null : round(base.satFat + addedFat * 0.15, 1),
      // 9 kcal per gram of fat.
      calories: round(base.calories + addedFat * 9, 0),
    },
    note: `Includes about ${addedFat} g of cooking fat${adjustment.note ? ` — ${adjustment.note}` : ""}.`,
  };
}

/** Divide a recipe total by servings, then multiply by how many were eaten. */
export function perPortion(total: Nutrients, servings: number, servingsEaten: number): Nutrients {
  const safeServings = servings > 0 ? servings : 1;
  const factor = servingsEaten / safeServings;
  return {
    calories: round(total.calories * factor, 0),
    protein: round(total.protein * factor, 1),
    carbs: round(total.carbs * factor, 1),
    fat: round(total.fat * factor, 1),
    fiber: total.fiber == null ? null : round(total.fiber * factor, 1),
    sugar: total.sugar == null ? null : round(total.sugar * factor, 1),
    satFat: total.satFat == null ? null : round(total.satFat * factor, 1),
    sodium: total.sodium == null ? null : round(total.sodium * factor, 0),
  };
}

/** Share of calories coming from each macro, for the ring/bar visuals. */
export function macroSplit(n: Nutrients): { protein: number; carbs: number; fat: number } {
  const p = n.protein * 4;
  const c = n.carbs * 4;
  const f = n.fat * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: round((p / total) * 100, 0),
    carbs: round((c / total) * 100, 0),
    fat: round((f / total) * 100, 0),
  };
}

/**
 * Neutral, non-prescriptive observations about a day's food.
 * Deliberately no targets, deficits or "you should eat less" framing — this is
 * about noticing what's there, not policing it.
 */
export function nutritionNotes(n: Nutrients, mealCount: number): string[] {
  const notes: string[] = [];
  if (mealCount === 0) return ["Nothing logged yet today."];

  const split = macroSplit(n);
  if (split.protein > 0) {
    notes.push(`Roughly ${split.protein}% protein, ${split.carbs}% carbs, ${split.fat}% fat by calories.`);
  }
  if ((n.fiber ?? 0) > 0) {
    notes.push(`${round(n.fiber ?? 0, 1)} g of fibre logged so far.`);
  }
  if (n.protein > 0) {
    notes.push(`${round(n.protein, 0)} g protein across ${mealCount} ${mealCount === 1 ? "entry" : "entries"}.`);
  }
  return notes;
}
