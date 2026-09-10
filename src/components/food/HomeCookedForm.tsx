"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { EstimateBadge, MacroBar, NutritionSummary } from "@/components/ui/Nutrition";
import { apiPost } from "@/lib/client";
import { macroSplit } from "@/lib/services/nutritionService";
import { AMOUNT_UNITS } from "@/lib/utils";
import { COOKING_METHODS, COOKING_METHOD_LABELS, type CookingMethod, type ServiceError } from "@/lib/types";
import type { RecipeEstimate } from "@/lib/services/recipeService";

interface IngredientRow {
  key: string;
  name: string;
  quantity: number;
  unit: string;
}

const newRow = (): IngredientRow => ({
  key: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  quantity: 100,
  unit: "g",
});

/**
 * Home-cooked meals: estimate from the ingredients, not from a picture of the
 * finished plate. Summing known components is the honest way to do this, and it
 * keeps every assumption visible.
 */
export function HomeCookedForm({
  onEstimated,
  suggestedIngredients,
  suggestedName,
}: {
  onEstimated: (estimate: RecipeEstimate, name: string, cookingMethod: string | null) => void;
  suggestedIngredients?: Array<{ name: string; grams: number }>;
  suggestedName?: string | null;
}) {
  const [name, setName] = useState(suggestedName ?? "");
  const [rows, setRows] = useState<IngredientRow[]>(
    suggestedIngredients?.length
      ? suggestedIngredients.map((s, i) => ({
          key: `seed-${i}`,
          name: s.name,
          quantity: s.grams,
          unit: "g",
        }))
      : [newRow(), newRow()],
  );
  const [servings, setServings] = useState(1);
  const [servingsEaten, setServingsEaten] = useState(1);
  const [method, setMethod] = useState<CookingMethod>("raw");

  const [estimate, setEstimate] = useState<RecipeEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<IngredientRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const remove = (key: string) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));

  const run = async () => {
    setFormError(null);
    setError(null);

    const ingredients = rows.filter((row) => row.name.trim() && row.quantity > 0);
    if (!ingredients.length) {
      setFormError("Add at least one ingredient with an amount.");
      return;
    }
    if (!name.trim()) {
      setFormError("Give the meal a name.");
      return;
    }

    setLoading(true);
    const res = await apiPost<RecipeEstimate>("/api/recipes/estimate", {
      ingredients: ingredients.map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity,
        unit: row.unit,
      })),
      servings,
      servingsEaten,
      cookingMethod: method,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEstimate(res.data);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cocoa-50 p-4">
        <p className="text-[12.5px] font-semibold text-cocoa-800">Built from your ingredients</p>
        <p className="mt-1 text-[12px] leading-relaxed text-cocoa-600">
          Home cooking has no label, so we add up the ingredients you list using reference
          composition data. It&rsquo;s an estimate — a good one when the amounts are roughly right,
          and you can correct anything before saving.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="hc-name">Meal name</label>
        <input
          id="hc-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Homemade chicken rice"
          maxLength={80}
        />
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <span className="label mb-0">Ingredients</span>
          <button
            onClick={() => setRows((current) => [...current, newRow()])}
            className="text-[12.5px] font-semibold text-caramel-700 hover:text-caramel-800"
          >
            + Add ingredient
          </button>
        </div>

        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.li
                key={row.key}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2"
              >
                <input
                  className="field flex-1"
                  placeholder="e.g. Chicken breast"
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  maxLength={60}
                  aria-label="Ingredient"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="field w-20 text-center tabular-nums"
                  value={row.quantity}
                  onChange={(e) => update(row.key, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Amount"
                />
                <select
                  className="field w-24"
                  value={row.unit}
                  onChange={(e) => update(row.key, { unit: e.target.value })}
                  aria-label="Unit"
                >
                  {AMOUNT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(row.key)}
                  aria-label="Remove ingredient"
                  disabled={rows.length === 1}
                  className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-cocoa-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div>
        <span className="label">Cooking method</span>
        <div className="flex flex-wrap gap-1.5">
          {COOKING_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`pill-toggle text-[12.5px] ${method === m ? "pill-on" : "pill-off"}`}
            >
              {COOKING_METHOD_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-cocoa-500">
          Frying adds oil the ingredient list doesn&rsquo;t capture, so we account for it roughly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="hc-servings">Recipe makes</label>
          <input
            id="hc-servings"
            type="number"
            inputMode="decimal"
            min={0.5}
            step="0.5"
            className="field"
            value={servings}
            onChange={(e) => setServings(Math.max(0.5, Number(e.target.value) || 1))}
          />
          <p className="mt-1 text-[11px] text-cocoa-500">servings in total</p>
        </div>
        <div>
          <label className="label" htmlFor="hc-eaten">You ate</label>
          <input
            id="hc-eaten"
            type="number"
            inputMode="decimal"
            min={0.25}
            step="0.25"
            className="field"
            value={servingsEaten}
            onChange={(e) => setServingsEaten(Math.max(0.25, Number(e.target.value) || 1))}
          />
          <p className="mt-1 text-[11px] text-cocoa-500">of those servings</p>
        </div>
      </div>

      {formError && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">{formError}</p>
      )}

      {error && <ErrorState message={error.message} hint={error.hint} onRetry={run} />}

      <Button fullWidth onClick={run} loading={loading}>
        {estimate ? "Re-calculate estimate" : "Estimate nutrition"}
      </Button>

      {/* Result ----------------------------------------------------------- */}
      <AnimatePresence>
        {estimate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-2xl border border-cocoa-200/60 bg-cream/70 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-cocoa-800">
                Your portion ({servingsEaten} of {servings})
              </span>
              <EstimateBadge label="Estimate" />
            </div>

            <NutritionSummary nutrients={estimate.portion} showExtended />
            <MacroBar split={macroSplit(estimate.portion)} />

            {estimate.cookingNote && (
              <p className="text-[12px] leading-relaxed text-cocoa-600">{estimate.cookingNote}</p>
            )}

            {estimate.unmatched.length > 0 && (
              <div className="rounded-xl border border-caramel-200 bg-caramel-50/60 px-3.5 py-2.5">
                <p className="text-[12.5px] font-semibold text-caramel-900">
                  Couldn&rsquo;t price {estimate.unmatched.length} ingredient
                  {estimate.unmatched.length === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-cocoa-600">
                  {estimate.unmatched.join(", ")} — they&rsquo;re counted as zero. Try a simpler
                  name (&ldquo;chicken&rdquo; rather than a brand), or leave them out.
                </p>
              </div>
            )}

            <details className="rounded-xl bg-white/70 px-3.5 py-2.5">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-cocoa-800">
                Where these numbers come from
              </summary>
              <ul className="mt-2.5 space-y-1.5">
                {estimate.ingredients.map((ing) => (
                  <li key={ing.key} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="min-w-0 truncate text-cocoa-700">
                      {ing.name}
                      {ing.matchedName && ing.matchedName.toLowerCase() !== ing.name.toLowerCase() && (
                        <span className="text-cocoa-400"> → {ing.matchedName}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-cocoa-500">
                      {Math.round(ing.grams)} g ·{" "}
                      {Math.round((ing.per100.calories * ing.grams) / 100)} kcal
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-cocoa-500">
                {estimate.disclaimer}
              </p>
            </details>

            <Button
              fullWidth
              onClick={() => onEstimated(estimate, name.trim(), method === "raw" ? null : method)}
            >
              Looks right — continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
