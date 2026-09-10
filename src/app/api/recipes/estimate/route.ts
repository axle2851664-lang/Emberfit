import { getCurrentUserId } from "@/lib/db";
import { estimateRecipe, type RecipeIngredientInput } from "@/lib/services/recipeService";
import { fromResult, handler, jsonError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Body {
  ingredients?: RecipeIngredientInput[];
  servings?: number;
  servingsEaten?: number;
  cookingMethod?: string | null;
}

export const POST = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  const ingredients = (body?.ingredients ?? []).filter((i) => i?.name?.trim());
  if (!ingredients.length) {
    return jsonError({
      code: "invalid_input",
      message: "Add at least one ingredient.",
      hint: "Even rough amounts give a more useful estimate than guessing the whole dish.",
    });
  }

  const userId = await getCurrentUserId();
  return fromResult(
    await estimateRecipe(userId, {
      ingredients: ingredients.slice(0, 40).map((i) => ({
        name: String(i.name).slice(0, 80),
        quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 100,
        unit: String(i.unit || "g"),
      })),
      servings: body?.servings,
      servingsEaten: body?.servingsEaten,
      cookingMethod: body?.cookingMethod ?? null,
    }),
  );
});
