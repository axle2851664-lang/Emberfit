/**
 * Pure-logic tests. No server, no network — these cover the parts where a
 * silent mistake would quietly corrupt someone's numbers.
 *
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";

import { decodeScanValue } from "../src/lib/services/barcodeService";
import { applyCookingMethod, macroSplit, perPortion } from "../src/lib/services/nutritionService";
import { matchLocalFood, searchLocalFoods } from "../src/lib/providers/localFoodProvider";
import { dayKey, parseList, scaleNutrients, sumNutrients, toGrams, stringifyList } from "../src/lib/utils";
import { FOOD_TABLE } from "../src/lib/data/foodTable";
import { EXERCISE_LIBRARY } from "../src/lib/data/exerciseLibrary";
import { MUSCLE_GROUPS, REGION_OF, hasQuality, type MuscleGroup } from "../src/lib/types";

// --- Barcode / QR decoding --------------------------------------------------

test("decodeScanValue reads a plain EAN-13", () => {
  const d = decodeScanValue("5000112637922");
  assert.equal(d.gtin, "5000112637922");
  assert.equal(d.kind, "barcode");
});

test("decodeScanValue pulls a GTIN out of a product URL", () => {
  const d = decodeScanValue("https://world.openfoodfacts.org/product/3017624010701/nutella", "qr_code");
  assert.equal(d.gtin, "3017624010701");
  assert.equal(d.kind, "qr");
});

test("decodeScanValue reads a GS1 element string", () => {
  assert.equal(decodeScanValue("(01)09506000134352").gtin, "09506000134352");
});

test("decodeScanValue reads a JSON QR payload", () => {
  const d = decodeScanValue('{"gtin":"4006381333931","name":"Test Bar"}', "qr_code");
  assert.equal(d.gtin, "4006381333931");
  assert.equal(d.productHint, "Test Bar");
});

test("decodeScanValue keeps free text as a search hint", () => {
  const d = decodeScanValue("Just some text");
  assert.equal(d.gtin, null);
  assert.equal(d.productHint, "Just some text");
});

// --- Open Food Facts response mapping ---------------------------------------
// The live API is exercised at runtime; here we pin the field mapping against a
// realistic payload so a provider change can't silently shift the numbers.

test("Open Food Facts nutriments map to per-100 g values", async () => {
  const { __testables } = await import("./offFixture");
  const food = __testables.toFoodResult({
    code: "3017624010701",
    product_name: "Nutella",
    brands: "Ferrero,Nutella",
    serving_size: "15 g",
    serving_quantity: "15",
    nutriments: {
      "energy-kcal_100g": 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
      "saturated-fat_100g": 10.6,
      sugars_100g: 56.3,
      fiber_100g: 0,
      sodium_100g: 0.0428, // grams in the API
    },
  });

  assert.ok(food);
  assert.equal(food!.name, "Nutella");
  assert.equal(food!.brand, "Ferrero"); // first brand only
  assert.equal(food!.per100.calories, 539);
  assert.equal(food!.per100.protein, 6.3);
  assert.equal(food!.per100.satFat, 10.6);
  assert.equal(food!.per100.sodium, 43); // converted to mg
  assert.equal(food!.servingGrams, 15);
});

test("Open Food Facts energy falls back to kJ", async () => {
  const { __testables } = await import("./offFixture");
  const food = __testables.toFoodResult({
    code: "1",
    product_name: "kJ only",
    nutriments: { "energy-kj_100g": 1000, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 },
  });
  assert.equal(food!.per100.calories, 239); // 1000 / 4.184
});

test("Open Food Facts records with no macros at all are rejected", async () => {
  const { __testables } = await import("./offFixture");
  assert.equal(__testables.toFoodResult({ code: "2", product_name: "Empty", nutriments: {} }), null);
});

// --- Nutrition maths --------------------------------------------------------

test("scaleNutrients scales per-100 g values to a portion", () => {
  const n = scaleNutrients({ calories: 200, protein: 10, carbs: 20, fat: 5, fiber: 2, sugar: 1, satFat: 1, sodium: 100 }, 250);
  assert.equal(n.calories, 500);
  assert.equal(n.protein, 25);
  assert.equal(n.sodium, 250);
});

test("sumNutrients adds items and keeps sensible precision", () => {
  const total = sumNutrients([
    { calories: 100, protein: 10.05, carbs: 5, fat: 1 },
    { calories: 50, protein: 2.05, carbs: 3, fat: 0.5 },
  ]);
  assert.equal(total.calories, 150);
  assert.equal(total.protein, 12.1);
});

test("macroSplit reports calorie share, not gram share", () => {
  // 25 g protein (100 kcal), 25 g carbs (100 kcal), 0 fat → 50/50.
  const split = macroSplit({ calories: 200, protein: 25, carbs: 25, fat: 0 });
  assert.equal(split.protein, 50);
  assert.equal(split.carbs, 50);
  assert.equal(split.fat, 0);
});

test("macroSplit is safe on an empty meal", () => {
  assert.deepEqual(macroSplit({ calories: 0, protein: 0, carbs: 0, fat: 0 }), {
    protein: 0, carbs: 0, fat: 0,
  });
});

test("perPortion divides a recipe by servings", () => {
  const portion = perPortion({ calories: 800, protein: 60, carbs: 80, fat: 20, fiber: 8, sugar: 4, satFat: 5, sodium: 400 }, 4, 1);
  assert.equal(portion.calories, 200);
  assert.equal(portion.protein, 15);
  assert.equal(portion.sodium, 100);
});

test("perPortion handles eating more than one serving", () => {
  const portion = perPortion({ calories: 800, protein: 60, carbs: 80, fat: 20 }, 4, 2);
  assert.equal(portion.calories, 400);
});

test("perPortion never divides by zero", () => {
  assert.equal(perPortion({ calories: 100, protein: 1, carbs: 1, fat: 1 }, 0, 1).calories, 100);
});

test("cooking method adds fat only when frying", () => {
  const base = { calories: 500, protein: 40, carbs: 50, fat: 10, fiber: 3, sugar: 2, satFat: 2, sodium: 200 };

  const boiled = applyCookingMethod(base, 400, "boiled");
  assert.deepEqual(boiled.nutrients, base);
  assert.equal(boiled.note, null);

  const fried = applyCookingMethod(base, 400, "deep_fried");
  assert.ok(fried.nutrients.fat > base.fat, "frying should add fat");
  assert.equal(fried.nutrients.fat, 42); // 8 g per 100 g × 400 g
  assert.equal(fried.nutrients.calories, 500 + 32 * 9);
  assert.match(fried.note!, /cooking fat/);
});

test("cooking method is a no-op when unset", () => {
  const base = { calories: 100, protein: 1, carbs: 1, fat: 1 };
  assert.deepEqual(applyCookingMethod(base, 100, null).nutrients, base);
});

// --- Unit conversion --------------------------------------------------------

test("toGrams converts common kitchen units", () => {
  assert.equal(toGrams(1, "kg"), 1000);
  assert.equal(toGrams(2, "tbsp"), 30);
  assert.equal(toGrams(1, "cup"), 240);
  assert.equal(toGrams(1, "oz"), 28.4);
});

test("toGrams uses a food's own serving weight when given", () => {
  assert.equal(toGrams(2, "serving", 55), 110);
  // Without a serving weight it falls back to a neutral 100 g.
  assert.equal(toGrams(2, "serving"), 200);
});

test("toGrams tolerates an unknown unit rather than throwing", () => {
  assert.equal(toGrams(5, "glorps"), 5);
});

// --- Food table & search ----------------------------------------------------

test("food search finds an exact name", () => {
  const results = searchLocalFoods("banana");
  assert.ok(results.length > 0);
  assert.match(results[0].name, /Banana/);
});

test("food search resolves aliases", () => {
  assert.match(matchLocalFood("ground beef")!.name, /Beef mince/);
  assert.match(matchLocalFood("zucchini")!.name, /Courgette/);
});

test("food search handles a query that contains the food name", () => {
  // Photo candidates often arrive as "grilled chicken breast".
  assert.ok(matchLocalFood("grilled chicken")?.name.includes("Chicken"));
});

test("food search returns nothing for gibberish", () => {
  assert.equal(matchLocalFood("qwertyuiop"), null);
});

test("every food table entry has sane macros", () => {
  for (const food of FOOD_TABLE) {
    const { calories, protein, carbs, fat } = food.per100;
    assert.ok(calories >= 0 && calories <= 950, `${food.key}: calories out of range`);
    assert.ok(protein >= 0 && protein <= 100, `${food.key}: protein out of range`);
    assert.ok(carbs >= 0 && carbs <= 100, `${food.key}: carbs out of range`);
    assert.ok(fat >= 0 && fat <= 100, `${food.key}: fat out of range`);

    // Macros must roughly account for the stated energy (water and fibre make
    // this approximate, so the tolerance is generous). Alcohol carries 7 kcal/g
    // that the macro model doesn't represent, so those entries are exempt.
    const derived = protein * 4 + carbs * 4 + fat * 9;
    if (calories > 20 && !food.energyFromAlcohol) {
      const ratio = derived / calories;
      assert.ok(ratio > 0.55 && ratio < 1.5, `${food.key}: energy ${calories} vs macros ${Math.round(derived)}`);
    }
  }
});

test("food table keys are unique", () => {
  const keys = FOOD_TABLE.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
});

// --- Exercise library -------------------------------------------------------

test("every exercise uses known muscle groups and has a region", () => {
  for (const exercise of EXERCISE_LIBRARY) {
    assert.ok(exercise.muscleGroups.length > 0, `${exercise.name} has no muscle groups`);
    for (const group of exercise.muscleGroups) {
      assert.ok(MUSCLE_GROUPS.includes(group), `${exercise.name}: unknown group ${group}`);
      assert.ok(REGION_OF[group as MuscleGroup], `${group} has no region`);
    }
    assert.ok(exercise.instructions.length > 10, `${exercise.name} needs instructions`);
  }
});

test("exercise names are unique", () => {
  const names = EXERCISE_LIBRARY.map((e) => e.name);
  assert.equal(new Set(names).size, names.length);
});

test("there are beginner-friendly options in every category", () => {
  for (const category of ["strength", "cardio", "mobility", "conditioning"]) {
    const found = EXERCISE_LIBRARY.some((e) => e.category === category && e.beginnerFriendly);
    assert.ok(found, `no beginner-friendly ${category} exercise`);
  }
});

// --- Small utilities --------------------------------------------------------

test("dayKey formats the local calendar day", () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(dayKey(new Date(2026, 11, 31)), "2026-12-31");
});

test("parseList survives malformed JSON", () => {
  assert.deepEqual(parseList('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseList("not json"), []);
  assert.deepEqual(parseList(null), []);
  assert.deepEqual(parseList('{"a":1}'), []);
  assert.deepEqual(parseList('[1,2,"c"]'), ["c"]);
});

test("stringifyList de-duplicates", () => {
  assert.equal(stringifyList(["a", "a", "b"]), '["a","b"]');
});

// --- Meal editing round trip ------------------------------------------------
// The edit screen converts stored per-portion totals back to per-100 g values.
// If that conversion drifted, simply opening and saving a meal would quietly
// change what you ate.

test("per-100 g conversion survives an edit round trip", () => {
  const grams = 33;
  const per100 = { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 1.3, sugar: 0.4, satFat: 3.1, sodium: 142 };

  // Save -> stored absolute values.
  const stored = scaleNutrients(per100, grams);

  // Edit screen converts back to per 100 g...
  const reopened = {
    calories: (stored.calories * 100) / grams,
    protein: (stored.protein * 100) / grams,
    carbs: (stored.carbs * 100) / grams,
    fat: (stored.fat * 100) / grams,
    fiber: ((stored.fiber ?? 0) * 100) / grams,
    sugar: ((stored.sugar ?? 0) * 100) / grams,
    satFat: ((stored.satFat ?? 0) * 100) / grams,
    sodium: ((stored.sodium ?? 0) * 100) / grams,
  };

  // ...and saving again must land on exactly the same stored values.
  const resaved = scaleNutrients(reopened, grams);
  assert.deepEqual(resaved, stored);
});

test("edit round trip is stable across repeated saves", () => {
  const grams = 47.5;
  let current = scaleNutrients({ calories: 217, protein: 3.4, carbs: 23.6, fat: 11.2, fiber: 0.7, sugar: 21.2, satFat: 6.8, sodium: 80 }, grams);

  for (let i = 0; i < 5; i++) {
    const back = {
      calories: (current.calories * 100) / grams,
      protein: (current.protein * 100) / grams,
      carbs: (current.carbs * 100) / grams,
      fat: (current.fat * 100) / grams,
      fiber: ((current.fiber ?? 0) * 100) / grams,
      sugar: ((current.sugar ?? 0) * 100) / grams,
      satFat: ((current.satFat ?? 0) * 100) / grams,
      sodium: ((current.sodium ?? 0) * 100) / grams,
    };
    const next = scaleNutrients(back, grams);
    assert.deepEqual(next, current, `drifted on pass ${i + 1}`);
    current = next;
  }
});

// --- Product quality signals ------------------------------------------------
// Parsed from Open Food Facts and shown as published. Pinned here because a
// silent parsing change would put a wrong grade next to somebody's food.

test("Open Food Facts quality fields are parsed as published", async () => {
  const { __testables } = await import("./offFixture");
  const q = __testables.toQuality({
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "c",
    additives_tags: ["en:e322", "en:e476", "not-an-additive"],
    labels_tags: ["en:organic", "en:fair-trade"],
  });

  assert.ok(q);
  assert.equal(q!.nutriScore, "d");
  assert.equal(q!.novaGroup, 4);
  assert.equal(q!.ecoScore, "c");
  assert.deepEqual(q!.additives, ["E322", "E476"]); // namespaced tags unwrapped
  assert.equal(q!.isOrganic, true);
});

test("missing or unknown grades are dropped rather than shown wrong", async () => {
  const { __testables } = await import("./offFixture");
  const q = __testables.toQuality({
    nutriscore_grade: "unknown",
    ecoscore_grade: "not-applicable",
    nova_group: 9, // out of the 1-4 range
    additives_tags: [],
    labels_tags: [],
  });
  // Nothing usable at all, so nothing is claimed.
  assert.equal(q, null);
});

test("a product with only a nutri-score still reports quality", async () => {
  const { __testables } = await import("./offFixture");
  const q = __testables.toQuality({ nutriscore_grade: "a" });
  assert.ok(q);
  assert.equal(q!.nutriScore, "a");
  assert.deepEqual(q!.additives, []);
  assert.equal(q!.isOrganic, false);
});

test("hasQuality is false for an empty record", () => {
  assert.equal(hasQuality(null), false);
  assert.equal(hasQuality({}), false);
  assert.equal(hasQuality({ additives: [] }), false);
  assert.equal(hasQuality({ nutriScore: "b" }), true);
  assert.equal(hasQuality({ isOrganic: true }), true);
});
