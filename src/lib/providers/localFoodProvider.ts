import { FOOD_TABLE, type TableFood } from "../data/foodTable";
import type { FoodResult } from "../types";

/**
 * The bundled composition table, exposed through the same shape as remote
 * providers. This is what keeps the app fully usable with no network and no
 * API keys.
 */

function toResult(food: TableFood): FoodResult {
  return {
    name: food.name,
    source: "local",
    sourceId: food.key,
    per100: food.per100,
    servingLabel: food.servingLabel ?? null,
    servingGrams: food.typicalGrams ?? null,
  };
}

/** Simple scoring search: exact > prefix > word-start > substring. */
export function searchLocalFoods(query: string, limit = 20): FoodResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: Array<{ score: number; food: TableFood }> = [];
  for (const food of FOOD_TABLE) {
    const haystacks = [food.name.toLowerCase(), ...(food.aliases ?? []).map((a) => a.toLowerCase())];
    let best = 0;
    for (const h of haystacks) {
      if (h === q) best = Math.max(best, 100);
      else if (h.startsWith(q)) best = Math.max(best, 80);
      else if (new RegExp(`\\b${escapeRegExp(q)}`).test(h)) best = Math.max(best, 60);
      else if (h.includes(q)) best = Math.max(best, 40);
    }
    // Also allow the query to be a superset, e.g. "grilled chicken" -> "chicken".
    if (best === 0) {
      for (const h of haystacks) {
        const token = h.split(",")[0];
        if (token.length > 3 && q.includes(token)) best = Math.max(best, 35);
      }
    }
    if (best > 0) scored.push({ score: best, food });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map((s) => toResult(s.food));
}

/** Best single match for a free-text food name, or null. */
export function matchLocalFood(name: string): FoodResult | null {
  return searchLocalFoods(name, 1)[0] ?? null;
}

export function getLocalFood(key: string): FoodResult | null {
  const found = FOOD_TABLE.find((food) => food.key === key);
  return found ? toResult(found) : null;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
