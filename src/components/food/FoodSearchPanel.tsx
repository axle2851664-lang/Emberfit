"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SearchBar, useDebounced } from "@/components/ui/SearchBar";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/client";
import type { FoodResult, ServiceError } from "@/lib/types";

/**
 * Search across saved foods, the built-in composition table and the product
 * database. Local results always render even when the remote lookup fails.
 */
export function FoodSearchPanel({
  onPick,
  autoFocus,
  initialQuery = "",
  emptyHint,
  onManualEntry,
}: {
  onPick: (food: FoodResult) => void;
  autoFocus?: boolean;
  initialQuery?: string;
  emptyHint?: string;
  onManualEntry?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebounced(query, 350);

  const [results, setResults] = useState<FoodResult[]>([]);
  const [degraded, setDegraded] = useState<{ message: string; hint?: string } | null>(null);
  const [error, setError] = useState<ServiceError | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setDegraded(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiGet<{ results: FoodResult[]; degraded?: { message: string; hint?: string } | null }>(
      `/api/foods/search?q=${encodeURIComponent(q)}`,
    ).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setResults(res.data.results);
        setDegraded(res.data.degraded ?? null);
        setError(null);
      } else {
        setResults([]);
        setError(res.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showEmpty = !loading && !error && debounced.trim().length >= 2 && results.length === 0;

  return (
    <div className="space-y-3.5">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search foods and products…"
        autoFocus={autoFocus}
        loading={loading}
      />

      {degraded && (
        <div className="rounded-xl border border-caramel-200 bg-caramel-50/60 px-3.5 py-2.5">
          <p className="text-[12.5px] font-medium text-caramel-900">{degraded.message}</p>
          <p className="mt-0.5 text-[12px] text-cocoa-600">
            {degraded.hint ?? "Showing results from the built-in food list."}
          </p>
        </div>
      )}

      {error && <ErrorState message={error.message} hint={error.hint} onRetry={() => setQuery(query + " ")} />}

      {loading && results.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {showEmpty && (
        <EmptyState
          icon="🔍"
          title={`No matches for "${debounced.trim()}"`}
          message={
            emptyHint ??
            "Try a simpler word (e.g. “rice” rather than the brand), or add it yourself with the values from the label."
          }
          action={
            onManualEntry ? <Button variant="secondary" onClick={onManualEntry}>Enter it manually</Button> : undefined
          }
        />
      )}

      {query.trim().length < 2 && !loading && (
        <p className="px-1 py-4 text-center text-[13px] text-cocoa-500">
          Type at least two characters to search.
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((food, i) => (
            <motion.li
              key={`${food.source}-${food.sourceId ?? food.name}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
            >
              <button
                onClick={() => onPick(food)}
                className="flex w-full items-center gap-3 rounded-xl border border-cocoa-200/60 bg-white/70 px-3.5 py-3 text-left transition hover:border-caramel-300 hover:bg-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-cocoa-900">{food.name}</span>
                  <span className="block truncate text-[11.5px] text-cocoa-500">
                    {food.brand ? `${food.brand} · ` : ""}
                    {Math.round(food.per100.calories)} kcal · P {food.per100.protein}g · C{" "}
                    {food.per100.carbs}g · F {food.per100.fat}g
                    <span className="text-cocoa-400"> / 100 g</span>
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-cocoa-400">
                  {food.source === "openfoodfacts" ? "Product" : food.source === "user" ? "Yours" : "Reference"}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Manual nutrition entry — the universal fallback when nothing is found. */
export function ManualFoodForm({
  onSubmit,
  initialName = "",
}: {
  onSubmit: (food: FoodResult, grams: number) => void;
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);
  const [grams, setGrams] = useState(100);
  const [basis, setBasis] = useState<"per100" | "perPortion">("perPortion");
  const [values, setValues] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError("Give the food a name.");
    const calories = Number(values.calories);
    if (!Number.isFinite(calories) || calories < 0) {
      return setError("Enter the calories — the rest is optional.");
    }
    if (grams <= 0) return setError("Enter how much you had.");

    const num = (v: string) => {
      const parsed = Number(v);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    // Normalise whatever the user typed into per-100 g values.
    const factor = basis === "per100" ? 1 : 100 / grams;
    const per100 = {
      calories: calories * factor,
      protein: num(values.protein) * factor,
      carbs: num(values.carbs) * factor,
      fat: num(values.fat) * factor,
      fiber: values.fiber ? num(values.fiber) * factor : null,
      sugar: null,
      satFat: null,
      sodium: null,
    };

    onSubmit(
      { name: name.trim(), source: "user", per100, servingGrams: grams, isEstimate: true },
      grams,
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="mf-name">Food name</label>
        <input
          id="mf-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Grandma's lasagne"
          maxLength={80}
        />
      </div>

      <div>
        <label className="label" htmlFor="mf-grams">How much did you have? (grams)</label>
        <input
          id="mf-grams"
          type="number"
          inputMode="decimal"
          min={1}
          className="field"
          value={grams}
          onChange={(e) => setGrams(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      <div>
        <span className="label">The numbers below are…</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setBasis("perPortion")}
            className={`pill-toggle flex-1 text-[12.5px] ${basis === "perPortion" ? "pill-on" : "pill-off"}`}
          >
            For this portion
          </button>
          <button
            onClick={() => setBasis("per100")}
            className={`pill-toggle flex-1 text-[12.5px] ${basis === "per100" ? "pill-on" : "pill-off"}`}
          >
            Per 100 g
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-cocoa-500">
          Packaging usually lists both — use whichever is easier to read off the label.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            ["calories", "Calories (kcal)"],
            ["protein", "Protein (g)"],
            ["carbs", "Carbs (g)"],
            ["fat", "Fat (g)"],
            ["fiber", "Fibre (g)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cocoa-500">
              {label}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className="field py-2 text-[13px]"
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={key === "calories" ? "required" : "optional"}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">{error}</p>
      )}

      <Button fullWidth onClick={submit}>
        Add to meal
      </Button>
    </div>
  );
}
