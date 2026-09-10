import { Suspense } from "react";
import { getCurrentUser } from "@/lib/db";
import { getDaySummary, getMealsForDay } from "@/lib/services/mealService";
import { FoodJournal } from "@/components/food/FoodJournal";
import { LoadingCard } from "@/components/ui/States";
import { dayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  const key = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : dayKey();

  const user = await getCurrentUser();
  const [meals, summary] = await Promise.all([
    getMealsForDay(user.id, key),
    getDaySummary(user.id, key),
  ]);

  return (
    <Suspense fallback={<LoadingCard lines={6} />}>
      <FoodJournal
        dayKey={key}
        summary={summary}
        meals={meals.map((meal) => ({
          id: meal.id,
          name: meal.name,
          slot: meal.slot,
          entryMethod: meal.entryMethod,
          eatenAt: meal.eatenAt.toISOString(),
          notes: meal.notes,
          isEstimate: meal.isEstimate,
          estimateNote: meal.estimateNote,
          confidence: meal.confidence,
          cookingMethod: meal.cookingMethod,
          servings: meal.servings,
          servingsEaten: meal.servingsEaten,
          items: meal.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            grams: item.grams,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            sugar: item.sugar,
            satFat: item.satFat,
            sodium: item.sodium,
            isEstimate: item.isEstimate,
            confidence: item.confidence,
          })),
        }))}
      />
    </Suspense>
  );
}
