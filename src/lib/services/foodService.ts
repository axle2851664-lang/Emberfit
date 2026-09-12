import { prisma } from "../db";
import { matchLocalFood, searchLocalFoods } from "../providers/localFoodProvider";
import { searchProducts } from "../providers/openFoodFacts";
import type { FoodQuality, FoodResult, Nutrients, Result } from "../types";
import { hasQuality, ok } from "../types";
import { parseList } from "../utils";

/**
 * FoodService — the single place the app asks "what is this food?".
 *
 * It merges three sources in priority order: foods the user saved, the bundled
 * composition table, and the remote product database. Callers never talk to a
 * provider directly, so replacing Open Food Facts later touches one file.
 */

/** Rebuild the published quality signals from a stored row. */
export function rowQuality(row: {
  nutriScore: string | null;
  novaGroup: number | null;
  ecoScore: string | null;
  additives: string;
  isOrganic: boolean;
}): FoodQuality | null {
  const quality: FoodQuality = {
    nutriScore: row.nutriScore,
    novaGroup: row.novaGroup,
    ecoScore: row.ecoScore,
    additives: parseList(row.additives),
    isOrganic: row.isOrganic,
  };
  return hasQuality(quality) ? quality : null;
}

function nutritionToNutrients(n: {
  calories: number; protein: number; carbs: number; fat: number;
  fiber: number | null; sugar: number | null; satFat: number | null; sodium: number | null;
}): Nutrients {
  return {
    calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat,
    fiber: n.fiber, sugar: n.sugar, satFat: n.satFat, sodium: n.sodium,
  };
}

/** Foods this user has saved before (including ones from past scans). */
export async function searchSavedFoods(userId: string, query: string, limit = 10): Promise<FoodResult[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await prisma.food.findMany({
    where: {
      AND: [
        { OR: [{ userId }, { userId: null }] },
        { name: { contains: q } },
      ],
    },
    include: { nutrition: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return rows
    .filter((row) => row.nutrition)
    .map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      barcode: row.barcode,
      source: row.source as FoodResult["source"],
      sourceId: row.sourceId,
      per100: nutritionToNutrients(row.nutrition!),
      servingLabel: row.servingLabel,
      servingGrams: row.servingGrams,
      quality: rowQuality(row),
    }));
}

export interface FoodSearchResponse {
  results: FoodResult[];
  /** Set when the remote provider was unavailable, so the UI can say so. */
  degraded?: { message: string; hint?: string } | null;
}

/** Search everything the app can reach, de-duplicated and ranked. */
export async function searchFoods(
  userId: string,
  query: string,
  options: { includeRemote?: boolean; limit?: number } = {},
): Promise<Result<FoodSearchResponse>> {
  const { includeRemote = true, limit = 25 } = options;
  const q = query.trim();
  if (!q) return ok({ results: [] });

  const [saved, local] = await Promise.all([
    searchSavedFoods(userId, q, 8),
    Promise.resolve(searchLocalFoods(q, 15)),
  ]);

  let remote: FoodResult[] = [];
  let degraded: FoodSearchResponse["degraded"] = null;

  if (includeRemote) {
    const res = await searchProducts(q, 12);
    if (res.ok) remote = res.data;
    // A remote failure is never fatal — local results still stand.
    else degraded = { message: res.error.message, hint: res.error.hint };
  }

  const seen = new Set<string>();
  const merged: FoodResult[] = [];
  for (const item of [...saved, ...local, ...remote]) {
    const key = `${item.name.toLowerCase()}|${(item.brand ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return ok({ results: merged.slice(0, limit), degraded });
}

/**
 * Resolve a free-text food name to nutrition data, for photo candidates and
 * recipe ingredients. Local-first: it is fast, deterministic and offline.
 */
export async function resolveFoodByName(
  userId: string,
  name: string,
  options: { allowRemote?: boolean } = {},
): Promise<FoodResult | null> {
  const saved = await searchSavedFoods(userId, name, 1);
  if (saved[0]) return saved[0];

  const local = matchLocalFood(name);
  if (local) return local;

  if (options.allowRemote) {
    const res = await searchProducts(name, 3);
    if (res.ok && res.data[0]) return res.data[0];
  }
  return null;
}

/**
 * Persist a food so it can be reused, without creating duplicates.
 * Foods from a provider are keyed by (source, sourceId); user foods are always
 * new records owned by the user.
 */
export async function upsertFood(userId: string, food: FoodResult): Promise<string> {
  const nutritionData = {
    calories: food.per100.calories,
    protein: food.per100.protein,
    carbs: food.per100.carbs,
    fat: food.per100.fat,
    fiber: food.per100.fiber ?? null,
    sugar: food.per100.sugar ?? null,
    satFat: food.per100.satFat ?? null,
    sodium: food.per100.sodium ?? null,
  };

  const qualityData = {
    nutriScore: food.quality?.nutriScore ?? null,
    novaGroup: food.quality?.novaGroup ?? null,
    ecoScore: food.quality?.ecoScore ?? null,
    additives: JSON.stringify(food.quality?.additives ?? []),
    isOrganic: food.quality?.isOrganic ?? false,
  };

  if (food.sourceId) {
    const existing = await prisma.food.findUnique({
      where: { source_sourceId: { source: food.source, sourceId: food.sourceId } },
    });
    if (existing) {
      await prisma.food.update({
        where: { id: existing.id },
        data: {
          name: food.name,
          brand: food.brand ?? null,
          barcode: food.barcode ?? null,
          servingLabel: food.servingLabel ?? null,
          servingGrams: food.servingGrams ?? null,
          ...qualityData,
          nutrition: { upsert: { create: nutritionData, update: nutritionData } },
        },
      });
      return existing.id;
    }
  }

  const created = await prisma.food.create({
    data: {
      name: food.name,
      brand: food.brand ?? null,
      barcode: food.barcode ?? null,
      source: food.source,
      sourceId: food.sourceId ?? null,
      servingLabel: food.servingLabel ?? null,
      servingGrams: food.servingGrams ?? null,
      isVerified: food.source === "openfoodfacts",
      userId: food.source === "user" ? userId : null,
      ...qualityData,
      nutrition: { create: nutritionData },
    },
  });
  return created.id;
}
