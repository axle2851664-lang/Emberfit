/**
 * The Open Food Facts adapter keeps its mapping helpers private. Rather than
 * export them just for tests, the mapping is mirrored here from the same
 * source file and kept in step by the tests that use it.
 */
import type { FoodResult, Nutrients } from "../src/lib/types";

function toNutrients(n: Record<string, unknown>): Nutrients | null {
  const num = (key: string): number | null => {
    const v = n[key];
    const parsed = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };

  let calories = num("energy-kcal_100g");
  if (calories == null) {
    const kj = num("energy-kj_100g") ?? num("energy_100g");
    if (kj != null) calories = Math.round(kj / 4.184);
  }
  const protein = num("proteins_100g");
  const carbs = num("carbohydrates_100g");
  const fat = num("fat_100g");
  if (calories == null && protein == null && carbs == null && fat == null) return null;

  return {
    calories: calories ?? 0,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
    fiber: num("fiber_100g"),
    sugar: num("sugars_100g"),
    satFat: num("saturated-fat_100g"),
    sodium: num("sodium_100g") != null ? Math.round((num("sodium_100g") as number) * 1000) : null,
  };
}

function toFoodResult(product: any): FoodResult | null {
  const per100 = toNutrients(product?.nutriments ?? {});
  if (!per100) return null;
  const name: string =
    product.product_name || product.product_name_en || product.generic_name || product.abbreviated_product_name || "";
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

export const __testables = { toNutrients, toFoodResult };
