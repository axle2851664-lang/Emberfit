import { prisma } from "../db";
import { upsertFood } from "./foodService";
import { macroSplit } from "./nutritionService";
import type { DraftItem, FoodResult, MealSlot, Nutrients, Result } from "../types";
import { err, ok } from "../types";
import { dayKey, scaleNutrients, sumNutrients } from "../utils";

/**
 * MealService — writing and reading the food journal.
 *
 * Each meal item stores its own resolved nutrition snapshot, so editing or
 * deleting a Food later never silently rewrites what someone ate last week.
 */

export interface SaveMealInput {
  name: string;
  slot: MealSlot;
  entryMethod: "manual" | "barcode" | "photo" | "homemade" | "search";
  eatenAt?: string | Date;
  notes?: string | null;
  items: Array<DraftItem & { food?: FoodResult | null }>;
  servings?: number;
  servingsEaten?: number;
  cookingMethod?: string | null;
  isEstimate?: boolean;
  estimateNote?: string | null;
  confidence?: number | null;
}

export async function createMeal(userId: string, input: SaveMealInput): Promise<Result<{ id: string }>> {
  if (!input.name?.trim()) return err("invalid_input", "Give the meal a name so you can find it later.");
  if (!input.items?.length) return err("invalid_input", "Add at least one food to the meal.");

  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date();
  if (Number.isNaN(eatenAt.getTime())) return err("invalid_input", "That date doesn't look right.");

  // Persist any foods that came from a provider so they're reusable offline.
  const itemData = [];
  for (const [index, item] of input.items.entries()) {
    let foodId = item.foodId ?? null;
    if (!foodId && item.food) {
      try {
        foodId = await upsertFood(userId, item.food);
      } catch (e) {
        // A failed food save must not lose the user's meal.
        console.error("[meal] could not save food", e);
      }
    }
    const n = scaleNutrients(item.per100, item.grams);
    itemData.push({
      foodId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      sugar: n.sugar,
      satFat: n.satFat,
      sodium: n.sodium,
      isEstimate: item.isEstimate ?? false,
      confidence: item.confidence ?? null,
      order: index,
    });
  }

  const meal = await prisma.meal.create({
    data: {
      userId,
      name: input.name.trim(),
      slot: input.slot,
      entryMethod: input.entryMethod,
      eatenAt,
      dayKey: dayKey(eatenAt),
      notes: input.notes?.trim() || null,
      servings: input.servings ?? 1,
      servingsEaten: input.servingsEaten ?? 1,
      cookingMethod: input.cookingMethod ?? null,
      isEstimate: input.isEstimate ?? false,
      estimateNote: input.estimateNote ?? null,
      confidence: input.confidence ?? null,
      items: { create: itemData },
    },
  });

  return ok({ id: meal.id });
}

export async function updateMeal(
  userId: string,
  mealId: string,
  input: SaveMealInput,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.meal.findFirst({ where: { id: mealId, userId } });
  if (!existing) return err("not_found", "That meal no longer exists.");

  const created = await createMealItemsPayload(userId, input);
  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : existing.eatenAt;

  await prisma.$transaction([
    prisma.mealItem.deleteMany({ where: { mealId } }),
    prisma.meal.update({
      where: { id: mealId },
      data: {
        name: input.name.trim(),
        slot: input.slot,
        eatenAt,
        dayKey: dayKey(eatenAt),
        notes: input.notes?.trim() || null,
        servings: input.servings ?? existing.servings,
        servingsEaten: input.servingsEaten ?? existing.servingsEaten,
        cookingMethod: input.cookingMethod ?? existing.cookingMethod,
        isEstimate: input.isEstimate ?? existing.isEstimate,
        estimateNote: input.estimateNote ?? existing.estimateNote,
        items: { create: created },
      },
    }),
  ]);

  return ok({ id: mealId });
}

async function createMealItemsPayload(userId: string, input: SaveMealInput) {
  const rows = [];
  for (const [index, item] of input.items.entries()) {
    let foodId = item.foodId ?? null;
    if (!foodId && item.food) {
      try {
        foodId = await upsertFood(userId, item.food);
      } catch {
        foodId = null;
      }
    }
    const n = scaleNutrients(item.per100, item.grams);
    rows.push({
      foodId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      sugar: n.sugar,
      satFat: n.satFat,
      sodium: n.sodium,
      isEstimate: item.isEstimate ?? false,
      confidence: item.confidence ?? null,
      order: index,
    });
  }
  return rows;
}

export async function deleteMeal(userId: string, mealId: string): Promise<Result<null>> {
  const existing = await prisma.meal.findFirst({ where: { id: mealId, userId } });
  if (!existing) return err("not_found", "That meal has already been removed.");
  // Items cascade; the scan record keeps its history with a null meal link.
  await prisma.meal.delete({ where: { id: mealId } });
  return ok(null);
}

export type MealWithItems = Awaited<ReturnType<typeof getMeal>> extends Result<infer T> ? T : never;

export async function getMeal(userId: string, mealId: string) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!meal) return err<never>("not_found", "That meal no longer exists.");
  return ok(meal);
}

export function totalsForItems(items: Array<Partial<Nutrients>>): Nutrients {
  return sumNutrients(items);
}

export interface DaySummary {
  dayKey: string;
  totals: Nutrients;
  split: { protein: number; carbs: number; fat: number };
  mealCount: number;
  bySlot: Record<MealSlot, { count: number; calories: number }>;
}

export async function getDaySummary(userId: string, key: string): Promise<DaySummary> {
  const meals = await prisma.meal.findMany({
    where: { userId, dayKey: key },
    include: { items: true },
  });

  const allItems = meals.flatMap((m) => m.items);
  const totals = sumNutrients(allItems);

  const bySlot = {
    breakfast: { count: 0, calories: 0 },
    lunch: { count: 0, calories: 0 },
    dinner: { count: 0, calories: 0 },
    snack: { count: 0, calories: 0 },
  } as DaySummary["bySlot"];

  for (const meal of meals) {
    const slot = (meal.slot as MealSlot) in bySlot ? (meal.slot as MealSlot) : "snack";
    bySlot[slot].count += 1;
    bySlot[slot].calories += meal.items.reduce((sum, i) => sum + i.calories, 0);
  }

  return { dayKey: key, totals, split: macroSplit(totals), mealCount: meals.length, bySlot };
}

/** Meals for a day, grouped into slots and ordered by time. */
export async function getMealsForDay(userId: string, key: string) {
  return prisma.meal.findMany({
    where: { userId, dayKey: key },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { eatenAt: "asc" },
  });
}

/** Per-day totals over a range, for the history page and charts. */
export async function getDailyTotals(userId: string, days: number) {
  const meals = await prisma.meal.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { eatenAt: "desc" },
    take: 500,
  });

  const byDay = new Map<string, { totals: Nutrients; count: number }>();
  for (const meal of meals) {
    const entry = byDay.get(meal.dayKey) ?? { totals: sumNutrients([]), count: 0 };
    entry.totals = sumNutrients([entry.totals, ...meal.items]);
    entry.count += 1;
    byDay.set(meal.dayKey, entry);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, days)
    .map(([key, value]) => ({ dayKey: key, ...value }));
}
