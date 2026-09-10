import { resolveFoodByName } from "./foodService";
import { applyCookingMethod, perPortion } from "./nutritionService";
import type { DraftItem, Nutrients, Result } from "../types";
import { ok } from "../types";
import { scaleNutrients, sumNutrients, toGrams } from "../utils";

/**
 * RecipeService — nutrition for home-cooked food.
 *
 * The core idea: estimate from the *ingredients*, not from the finished dish.
 * Summing known ingredient amounts is far more defensible than guessing a whole
 * plate, and every part of it stays visible and editable to the user.
 */

export interface RecipeIngredientInput {
  name: string;
  quantity: number;
  unit: string;
}

export interface EstimatedIngredient extends DraftItem {
  matched: boolean;
  matchedName: string | null;
}

export interface RecipeEstimate {
  ingredients: EstimatedIngredient[];
  /** Whole recipe, before dividing by servings. */
  recipeTotal: Nutrients;
  /** What the user actually ate. */
  portion: Nutrients;
  servings: number;
  servingsEaten: number;
  cookingMethod: string | null;
  cookingNote: string | null;
  /** Ingredients we couldn't price — surfaced so the user can fix them. */
  unmatched: string[];
  disclaimer: string;
}

export async function estimateRecipe(
  userId: string,
  input: {
    ingredients: RecipeIngredientInput[];
    servings?: number;
    servingsEaten?: number;
    cookingMethod?: string | null;
    allowRemote?: boolean;
  },
): Promise<Result<RecipeEstimate>> {
  const servings = input.servings && input.servings > 0 ? input.servings : 1;
  const servingsEaten = input.servingsEaten && input.servingsEaten > 0 ? input.servingsEaten : 1;

  const ingredients: EstimatedIngredient[] = [];
  const unmatched: string[] = [];

  for (const [index, raw] of input.ingredients.entries()) {
    const name = raw.name.trim();
    if (!name) continue;

    const match = await resolveFoodByName(userId, name, { allowRemote: input.allowRemote });
    const grams = toGrams(raw.quantity, raw.unit, match?.servingGrams ?? null);

    if (!match) unmatched.push(name);

    ingredients.push({
      key: `ing-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      quantity: raw.quantity,
      unit: raw.unit,
      grams,
      // An unmatched ingredient contributes nothing rather than a made-up value.
      per100: match?.per100 ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 },
      foodId: match?.id ?? null,
      isEstimate: true,
      confidence: match ? 0.7 : 0.2,
      matched: Boolean(match),
      matchedName: match?.name ?? null,
    });
  }

  const rawTotal = sumNutrients(ingredients.map((i) => scaleNutrients(i.per100, i.grams)));
  const totalGrams = ingredients.reduce((sum, i) => sum + i.grams, 0);
  const cooked = applyCookingMethod(rawTotal, totalGrams, input.cookingMethod);
  const portion = perPortion(cooked.nutrients, servings, servingsEaten);

  return ok({
    ingredients,
    recipeTotal: cooked.nutrients,
    portion,
    servings,
    servingsEaten,
    cookingMethod: input.cookingMethod ?? null,
    cookingNote: cooked.note,
    unmatched,
    disclaimer:
      "Estimated from the ingredients you entered using reference composition data. Real recipes vary — adjust anything that looks off before saving.",
  });
}
