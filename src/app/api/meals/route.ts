import { getCurrentUserId } from "@/lib/db";
import { createMeal, getDaySummary, getMealsForDay, type SaveMealInput } from "@/lib/services/mealService";
import { fromResult, handler, jsonOk, readJson, jsonError } from "@/lib/api";
import { dayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("day") ?? dayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return jsonError({ code: "invalid_input", message: "That date isn't valid." });
  }

  const userId = await getCurrentUserId();
  const [meals, summary] = await Promise.all([
    getMealsForDay(userId, key),
    getDaySummary(userId, key),
  ]);
  return jsonOk({ meals, summary });
});

export const POST = handler(async (request: Request) => {
  const body = await readJson<SaveMealInput>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const userId = await getCurrentUserId();
  return fromResult(await createMeal(userId, body), 201);
});
