"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { EstimateBadge, MacroBar, NutritionSummary } from "@/components/ui/Nutrition";
import { apiDelete } from "@/lib/client";
import { addDays, dayKey, dayKeyToDate, formatDayLabel, sumNutrients } from "@/lib/utils";
import { MEAL_SLOTS, MEAL_SLOT_LABELS, type MealSlot } from "@/lib/types";
import type { DaySummary } from "@/lib/services/mealService";

export interface JournalItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  satFat: number | null;
  sodium: number | null;
  isEstimate: boolean;
  confidence: number | null;
}

export interface JournalMeal {
  id: string;
  name: string;
  slot: string;
  entryMethod: string;
  eatenAt: string;
  notes: string | null;
  isEstimate: boolean;
  estimateNote: string | null;
  confidence: number | null;
  cookingMethod: string | null;
  servings: number;
  servingsEaten: number;
  items: JournalItem[];
}

const METHOD_LABELS: Record<string, string> = {
  photo: "📷 From a photo",
  barcode: "🔎 Scanned",
  homemade: "🍲 Home-cooked",
  search: "🔤 Searched",
  manual: "✍️ Entered by hand",
};

export function FoodJournal({
  dayKey: key,
  summary,
  meals,
}: {
  dayKey: string;
  summary: DaySummary;
  meals: JournalMeal[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState<JournalMeal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isToday = key === dayKey();
  const goTo = (target: string) => router.push(`/food?day=${target}`);

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await apiDelete(`/api/meals/${confirmDelete.id}`);
    setDeleting(false);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.success(`Removed "${confirmDelete.name}"`);
    setConfirmDelete(null);
    router.refresh();
  };

  const bySlot = MEAL_SLOTS.map((slot) => ({
    slot,
    meals: meals.filter((meal) => meal.slot === slot),
  })).filter((group) => group.meals.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl font-semibold">Food journal</h1>
          <p className="mt-1 text-sm text-cocoa-600">
            What you ate, and what&rsquo;s in it. No targets, no scores.
          </p>
        </div>
        <Link href="/food/add">
          <Button>Add a meal</Button>
        </Link>
      </header>

      {/* Day switcher ------------------------------------------------------ */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => goTo(dayKey(addDays(dayKeyToDate(key), -1)))}
          aria-label="Previous day"
        >
          ←
        </Button>
        <div className="flex-1 text-center">
          <p className="heading text-lg font-semibold">{formatDayLabel(key)}</p>
          <p className="text-[11.5px] text-cocoa-500">
            {dayKeyToDate(key).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => goTo(dayKey(addDays(dayKeyToDate(key), 1)))}
          disabled={isToday}
          aria-label="Next day"
        >
          →
        </Button>
      </div>

      {/* Day total --------------------------------------------------------- */}
      <Card>
        {summary.mealCount === 0 ? (
          <EmptyState
            icon="🍽️"
            title={isToday ? "Nothing logged today" : "Nothing logged that day"}
            message="Photos, barcodes and home-cooked recipes all end up here."
            action={
              isToday ? (
                <Link href="/food/add">
                  <Button>Add your first meal</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="heading text-lg font-semibold">Day total</h2>
              <span className="text-[12.5px] text-cocoa-500">
                {summary.mealCount} {summary.mealCount === 1 ? "entry" : "entries"}
              </span>
            </div>
            <NutritionSummary nutrients={summary.totals} showExtended />
            <MacroBar split={summary.split} className="mt-5" />
            <p className="mt-4 text-[12px] leading-relaxed text-cocoa-500">
              Totals add up what you logged. Anything marked as an estimate is an approximation —
              useful for noticing patterns, not for precision.
            </p>
          </>
        )}
      </Card>

      {/* Meals by slot ----------------------------------------------------- */}
      {bySlot.map(({ slot, meals: slotMeals }) => {
        const slotTotals = sumNutrients(slotMeals.flatMap((m) => m.items));
        return (
          <section key={slot}>
            <SectionTitle
              action={
                <span className="text-[12.5px] font-medium tabular-nums text-cocoa-500">
                  {slotTotals.calories} kcal
                </span>
              }
            >
              {MEAL_SLOT_LABELS[slot as MealSlot]}
            </SectionTitle>

            <div className="space-y-3">
              {slotMeals.map((meal, i) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  delay={i}
                  onDelete={() => setConfirmDelete(meal)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove this meal?"
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" fullWidth onClick={remove} loading={deleting}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-cocoa-700">
          &ldquo;{confirmDelete?.name}&rdquo; will be deleted from your journal and removed from
          that day&rsquo;s totals. This can&rsquo;t be undone.
        </p>
      </Modal>
    </div>
  );
}

function MealCard({
  meal,
  delay,
  onDelete,
}: {
  meal: JournalMeal;
  delay: number;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totals = sumNutrients(meal.items);

  return (
    <Card delay={delay} className="p-4" >
      <div id={`meal-${meal.id}`} className="scroll-mt-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="heading text-base font-semibold">{meal.name}</h3>
              {meal.isEstimate && <EstimateBadge confidence={meal.confidence} />}
            </div>
            <p className="mt-0.5 text-[11.5px] text-cocoa-500">
              {new Date(meal.eatenAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {METHOD_LABELS[meal.entryMethod] ?? meal.entryMethod} · {meal.items.length} item
              {meal.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              href={`/food/add?edit=${meal.id}`}
              aria-label={`Edit ${meal.name}`}
              title="Edit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-cocoa-300 transition hover:bg-cocoa-100 hover:text-cocoa-700"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M11.3 2.7a1.5 1.5 0 0 1 2 2L6 12l-3 1 1-3 7.3-7.3z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <button
              onClick={onDelete}
              aria-label={`Remove ${meal.name}`}
              title="Remove"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-cocoa-300 transition hover:bg-red-50 hover:text-red-600"
            >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            </button>
          </div>
        </div>

        <div className="mt-3.5">
          <NutritionSummary nutrients={totals} />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12.5px] font-semibold text-caramel-700 hover:text-caramel-800"
        >
          {expanded ? "Hide breakdown" : `Show breakdown (${meal.items.length})`}
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-1.5 border-t border-cocoa-200/60 pt-3">
              {meal.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-cocoa-700">
                    {item.name}
                    <span className="text-cocoa-400"> · {Math.round(item.grams)} g</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-cocoa-600">
                    {Math.round(item.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>

            {meal.cookingMethod && (
              <p className="mt-2.5 text-[12px] text-cocoa-500">
                Cooking method: {meal.cookingMethod.replace(/_/g, " ")}
                {meal.servings > 1 &&
                  ` · ${meal.servingsEaten} of ${meal.servings} servings`}
              </p>
            )}
            {meal.estimateNote && (
              <p className="mt-2.5 rounded-xl bg-cream/80 px-3 py-2 text-[11.5px] leading-relaxed text-cocoa-600">
                {meal.estimateNote}
              </p>
            )}
            {meal.notes && (
              <p className="mt-2.5 text-[12px] italic text-cocoa-600">&ldquo;{meal.notes}&rdquo;</p>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
