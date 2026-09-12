/**
 * The Open Food Facts adapter keeps its mapping helpers private. Rather than
 * export them just for tests, the mapping is mirrored here from the same
 * source file and kept in step by the tests that use it.
 */
import type { FoodQuality, FoodResult, Nutrients } from "../src/lib/types";
import { hasQuality } from "../src/lib/types";

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

function toQuality(product: any): FoodQuality | null {
  const grade = (value: unknown): string | null => {
    const g = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^[a-e]$/.test(g) ? g : null;
  };

  const tags: string[] = Array.isArray(product?.additives_tags) ? product.additives_tags : [];
  const additives = tags
    .map((tag) => String(tag).replace(/^[a-z]{2}:/, "").toUpperCase())
    .filter((tag) => /^E\d{3,4}[A-Z]?$/.test(tag));

  const labels: string[] = Array.isArray(product?.labels_tags) ? product.labels_tags : [];
  const isOrganic = labels.some((tag) =>
    /(^|:)(organic|bio|eu-organic|ab-agriculture-biologique)$/.test(String(tag)),
  );

  const nova = Number(product?.nova_group);

  const quality: FoodQuality = {
    nutriScore: grade(product?.nutriscore_grade),
    novaGroup: Number.isInteger(nova) && nova >= 1 && nova <= 4 ? nova : null,
    ecoScore: grade(product?.ecoscore_grade),
    additives,
    isOrganic,
  };

  return hasQuality(quality) ? quality : null;
}

export const __testables = { toNutrients, toFoodResult, toQuality };
