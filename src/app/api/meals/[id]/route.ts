import { getCurrentUserId } from "@/lib/db";
import { deleteMeal, getMeal, updateMeal, type SaveMealInput } from "@/lib/services/mealService";
import { fromResult, handler, jsonError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  return fromResult(await getMeal(userId, id));
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await readJson<SaveMealInput>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const userId = await getCurrentUserId();
  return fromResult(await updateMeal(userId, id, body));
});

export const DELETE = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  return fromResult(await deleteMeal(userId, id));
});
