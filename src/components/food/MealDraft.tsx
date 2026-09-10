"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { EstimateBadge, MacroBar, NutritionSummary } from "@/components/ui/Nutrition";
import { macroSplit } from "@/lib/services/nutritionService";
import { AMOUNT_UNITS, scaleNutrients, sumNutrients, toGrams } from "@/lib/utils";
import type { DraftItem, MealSlot, Nutrients } from "@/lib/types";
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from "@/lib/types";

/**
 * The review step every logging path funnels into. Whatever produced the items
 * — a photo, a barcode, a recipe, a search — the user sees and can correct the
 * same thing before anything is saved.
 */

export function useDraftTotals(items: DraftItem[]): Nutrients {
  return useMemo(() => sumNutrients(items.map((i) => scaleNutrients(i.per100, i.grams))), [items]);
}

export function DraftItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  const nutrients = scaleNutrients(item.per100, item.grams);
  const hasData = item.per100.calories > 0 || item.per100.protein > 0;

  const setQuantity = (quantity: number) =>
    onChange({ quantity, grams: toGrams(quantity, item.unit) });

  const setUnit = (unit: string) => onChange({ unit, grams: toGrams(item.quantity, unit) });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border border-cocoa-200/60 bg-white/70 p-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-sm font-semibold text-cocoa-900 outline-none focus:underline"
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={80}
            aria-label="Food name"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.confidence != null && (
              <EstimateBadge
                confidence={item.confidence}
                label={
                  item.confidence >= 0.75
                    ? "Likely match"
                    : item.confidence >= 0.5
                      ? "Possible match"
                      : "Low confidence"
                }
              />
            )}
            {!hasData && (
              <span className="text-[11px] font-medium text-caramel-700">
                No nutrition data — search for it or type the values
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-cocoa-300 transition hover:bg-red-50 hover:text-red-600"
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={item.quantity}
          onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
          className="field w-20 py-2 text-center text-[13px] tabular-nums"
          aria-label="Amount"
        />
        <select
          value={item.unit}
          onChange={(e) => setUnit(e.target.value)}
          className="field w-28 py-2 text-[13px]"
          aria-label="Unit"
        >
          {AMOUNT_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <span className="text-[11.5px] text-cocoa-500">≈ {Math.round(item.grams)} g</span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-cocoa-800">
          {nutrients.calories} kcal
        </span>
      </div>

      <div className="mt-2.5 flex gap-3 text-[11.5px] font-medium text-cocoa-500">
        <span>P {nutrients.protein} g</span>
        <span>C {nutrients.carbs} g</span>
        <span>F {nutrients.fat} g</span>
      </div>
    </motion.li>
  );
}

export function DraftReview({
  items,
  onChangeItem,
  onRemoveItem,
  mealName,
  onMealNameChange,
  slot,
  onSlotChange,
  notes,
  onNotesChange,
  estimateNote,
  extra,
  onSave,
  saving,
  saveLabel = "Save meal",
  onAddMore,
}: {
  items: DraftItem[];
  onChangeItem: (key: string, patch: Partial<DraftItem>) => void;
  onRemoveItem: (key: string) => void;
  mealName: string;
  onMealNameChange: (value: string) => void;
  slot: MealSlot;
  onSlotChange: (slot: MealSlot) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  estimateNote?: string | null;
  extra?: React.ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  onAddMore?: () => void;
}) {
  const totals = useDraftTotals(items);
  const split = macroSplit(totals);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="meal-name">
            Meal name
          </label>
          <input
            id="meal-name"
            className="field"
            value={mealName}
            onChange={(e) => onMealNameChange(e.target.value)}
            placeholder="e.g. Chicken and rice"
            maxLength={80}
          />
        </div>
        <div>
          <span className="label">When</span>
          <div className="flex gap-1.5">
            {MEAL_SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => onSlotChange(s)}
                className={`pill-toggle flex-1 text-[12.5px] ${slot === s ? "pill-on" : "pill-off"}`}
              >
                {MEAL_SLOT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {extra}

      <div>
        <div className="mb-2 flex items-end justify-between">
          <span className="label mb-0">Items ({items.length})</span>
          {onAddMore && (
            <button
              onClick={onAddMore}
              className="text-[12.5px] font-semibold text-caramel-700 hover:text-caramel-800"
            >
              + Add another
            </button>
          )}
        </div>
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <DraftItemRow
                key={item.key}
                item={item}
                onChange={(patch) => onChangeItem(item.key, patch)}
                onRemove={() => onRemoveItem(item.key)}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="rounded-2xl bg-cream/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-cocoa-800">Meal total</span>
          {estimateNote && <EstimateBadge label="Estimate" />}
        </div>
        <NutritionSummary nutrients={totals} showExtended />
        <MacroBar split={split} className="mt-4" />
        {estimateNote && (
          <p className="mt-3.5 text-[12px] leading-relaxed text-cocoa-600">{estimateNote}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="meal-notes">
          Notes <span className="font-normal text-cocoa-400">(optional)</span>
        </label>
        <textarea
          id="meal-notes"
          className="field min-h-[70px] resize-y"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Anything worth remembering"
          maxLength={400}
        />
      </div>

      <Button fullWidth size="lg" onClick={onSave} loading={saving} disabled={items.length === 0}>
        {saveLabel}
      </Button>
    </div>
  );
}
