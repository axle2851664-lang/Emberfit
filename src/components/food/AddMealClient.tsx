"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingCard } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPost, apiPut } from "@/lib/client";
import { toGrams } from "@/lib/utils";
import type { DraftItem, FoodResult, MealSlot, PhotoCandidate } from "@/lib/types";
import { EMPTY_NUTRIENTS } from "@/lib/types";
import type { RecipeEstimate } from "@/lib/services/recipeService";
import { PhotoScanner } from "./PhotoScanner";
import { BarcodeScanner } from "./BarcodeScanner";
import { HomeCookedForm } from "./HomeCookedForm";
import { FoodSearchPanel, ManualFoodForm } from "./FoodSearchPanel";
import { DraftReview } from "./MealDraft";

type Mode = "photo" | "barcode" | "homemade" | "search";
type Step = "capture" | "review";

const MODES: Array<{ key: Mode; emoji: string; label: string; caption: string }> = [
  { key: "photo", emoji: "📷", label: "Photo", caption: "Snap the plate" },
  { key: "barcode", emoji: "🔎", label: "Barcode", caption: "Packaged food" },
  { key: "homemade", emoji: "🍲", label: "Home-cooked", caption: "From ingredients" },
  { key: "search", emoji: "🔤", label: "Search", caption: "By name" },
];

function defaultSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

let keyCounter = 0;
const nextKey = () => `item-${Date.now()}-${keyCounter++}`;

export function AddMealClient() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  // ?edit=<id> reuses this whole screen to change a meal already in the
  // journal, rather than duplicating the review UI somewhere else.
  const editId = params.get("edit");
  const initialMode = (params.get("mode") as Mode) || "photo";
  const [mode, setMode] = useState<Mode>(
    MODES.some((m) => m.key === initialMode) ? initialMode : "photo",
  );
  const [step, setStep] = useState<Step>(editId ? "review" : "capture");
  const [loadingMeal, setLoadingMeal] = useState(Boolean(editId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [items, setItems] = useState<DraftItem[]>([]);
  const [mealName, setMealName] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());
  const [notes, setNotes] = useState("");
  const [entryMethod, setEntryMethod] = useState<Mode>(initialMode);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [servings, setServings] = useState(1);
  const [servingsEaten, setServingsEaten] = useState(1);
  const [cookingMethod, setCookingMethod] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const [saving, setSaving] = useState(false);

  const isEstimate = useMemo(
    () => items.some((i) => i.isEstimate) || entryMethod === "photo" || entryMethod === "homemade",
    [items, entryMethod],
  );

  // --- Draft plumbing -------------------------------------------------------

  const addFood = useCallback((food: FoodResult, grams?: number) => {
    const amount = grams ?? food.servingGrams ?? 100;
    setItems((current) => [
      ...current,
      {
        key: nextKey(),
        name: food.name,
        quantity: amount,
        unit: "g",
        grams: amount,
        per100: food.per100,
        foodId: food.id ?? null,
        isEstimate: food.isEstimate ?? false,
        confidence: food.confidence ?? null,
        // Kept whole so the barcode and provider id survive the save.
        food,
      },
    ]);
    setMealName((current) => current || food.name);
  }, []);

  const changeItem = (key: string, patch: Partial<DraftItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const removeItem = (key: string) =>
    setItems((current) => current.filter((item) => item.key !== key));

  // --- Mode handoffs --------------------------------------------------------

  const fromPhoto = (candidates: PhotoCandidate[], nameGuess: string | null) => {
    setItems(
      candidates.map((candidate) => ({
        key: nextKey(),
        name: candidate.name,
        quantity: candidate.estimatedGrams,
        unit: "g",
        grams: candidate.estimatedGrams,
        per100: candidate.per100 ?? EMPTY_NUTRIENTS,
        isEstimate: true,
        confidence: candidate.confidence,
      })),
    );
    setMealName(nameGuess || candidates.map((c) => c.name).slice(0, 2).join(" & ") || "Photo meal");
    setEntryMethod("photo");
    setConfidence(
      candidates.length
        ? candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length
        : null,
    );
    setEstimateNote(
      "Estimated from a photo — please review the foods and portion sizes before saving. Portions from an image are rough by nature.",
    );
    setStep("review");
  };

  const fromBarcode = (food: FoodResult) => {
    addFood(food, food.servingGrams ?? 100);
    setEntryMethod("barcode");
    setMealName(food.name);
    setEstimateNote(
      food.servingGrams
        ? `Nutrition is from the product label. The amount is pre-filled with one serving (${Math.round(food.servingGrams)} g) — adjust it to what you actually had.`
        : "Nutrition is from the product label. Set the amount to what you actually had.",
    );
    setConfidence(null);
    setStep("review");
    toast.success(`Found ${food.name}`, food.brand ?? undefined);
  };

  const fromRecipe = (estimate: RecipeEstimate, name: string, method: string | null) => {
    // One line per ingredient, already scaled to the portion actually eaten.
    const portionFactor = estimate.servingsEaten / (estimate.servings || 1);
    setItems(
      estimate.ingredients.map((ing) => ({
        key: nextKey(),
        name: ing.name,
        quantity: Math.round(ing.grams * portionFactor * 10) / 10,
        unit: "g",
        grams: Math.round(ing.grams * portionFactor * 10) / 10,
        per100: ing.per100,
        foodId: ing.foodId ?? null,
        isEstimate: true,
        confidence: ing.confidence,
      })),
    );
    setMealName(name || "Home-cooked meal");
    setEntryMethod("homemade");
    setServings(estimate.servings);
    setServingsEaten(estimate.servingsEaten);
    setCookingMethod(method);
    setEstimateNote(
      [estimate.disclaimer, estimate.cookingNote].filter(Boolean).join(" "),
    );
    setConfidence(null);
    setStep("review");
  };

  const fromSearch = (food: FoodResult) => {
    addFood(food);
    setEntryMethod((current) => (current === "search" ? "search" : current));
    if (items.length === 0) {
      setEstimateNote(
        food.source === "local"
          ? "Nutrition comes from a reference composition table, so it's a good approximation rather than an exact measurement."
          : null,
      );
    }
    setStep("review");
  };

  // --- Save -----------------------------------------------------------------

  const save = async () => {
    if (!items.length) {
      toast.error("Add at least one food first.");
      return;
    }
    if (!mealName.trim()) {
      toast.error("Give the meal a name.", "It makes your history much easier to read.");
      return;
    }

    setSaving(true);
    const payload = {
      name: mealName.trim(),
      slot,
      entryMethod,
      notes: notes.trim() || null,
      items: items.map((item) => ({
        ...item,
        // Prefer the real food record (barcode, provider id and all). Items
        // that never came from one — photo candidates, recipe ingredients —
        // still get saved so they're searchable next time.
        food: item.foodId
          ? null
          : (item.food ?? { name: item.name, source: "user" as const, per100: item.per100 }),
      })),
      servings,
      servingsEaten,
      cookingMethod,
      isEstimate,
      estimateNote,
      confidence,
    };

    const res = editId
      ? await apiPut<{ id: string }>(`/api/meals/${editId}`, payload)
      : await apiPost<{ id: string }>("/api/meals", payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }

    toast.success(
      editId ? "Meal updated" : "Meal saved",
      editId ? undefined : "You can edit or remove it any time from your food journal.",
    );
    router.push("/food");
    router.refresh();
  };

  // Keep the URL honest when the mode changes, so back/forward behave.
  useEffect(() => {
    if (editId) return; // editing keeps whatever method the meal was logged with
    setEntryMethod(mode);
  }, [mode, editId]);

  // Load the meal being edited into the same draft the other paths produce.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;

    apiGet<{
      id: string;
      name: string;
      slot: MealSlot;
      entryMethod: string;
      notes: string | null;
      servings: number;
      servingsEaten: number;
      cookingMethod: string | null;
      isEstimate: boolean;
      estimateNote: string | null;
      confidence: number | null;
      items: Array<{
        id: string;
        foodId: string | null;
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
      }>;
    }>(`/api/meals/${editId}`).then((res) => {
      if (cancelled) return;
      setLoadingMeal(false);

      if (!res.ok) {
        setLoadError(res.error.message);
        return;
      }

      const meal = res.data;
      setMealName(meal.name);
      setSlot(meal.slot);
      setNotes(meal.notes ?? "");
      setEntryMethod((meal.entryMethod as Mode) ?? "manual");
      setServings(meal.servings);
      setServingsEaten(meal.servingsEaten);
      setCookingMethod(meal.cookingMethod);
      setEstimateNote(meal.estimateNote);
      setConfidence(meal.confidence);

      // Stored items hold absolute values for the portion eaten; the editor
      // works in per-100 g, so convert back.
      setItems(
        meal.items.map((item) => {
          const grams = item.grams > 0 ? item.grams : 100;
          const per = (value: number | null) =>
            value == null ? null : (value * 100) / grams;
          return {
            key: nextKey(),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            grams,
            per100: {
              calories: (item.calories * 100) / grams,
              protein: (item.protein * 100) / grams,
              carbs: (item.carbs * 100) / grams,
              fat: (item.fat * 100) / grams,
              fiber: per(item.fiber),
              sugar: per(item.sugar),
              satFat: per(item.satFat),
              sodium: per(item.sodium),
            },
            foodId: item.foodId,
            isEstimate: item.isEstimate,
            confidence: item.confidence,
          };
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [editId]);

  // --- Render ---------------------------------------------------------------

  if (loadingMeal) {
    return (
      <div className="mx-auto max-w-2xl">
        <LoadingCard lines={6} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Couldn't open that meal"
          message={loadError}
          hint="It may have been deleted. Your journal is still intact."
          onRetry={() => router.push("/food")}
          retryLabel="Back to the journal"
        />
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <button
            onClick={() => (editId ? router.push("/food") : setStep("capture"))}
            className="text-[13px] font-semibold text-caramel-700 hover:text-caramel-800"
          >
            ← Back
          </button>
          <h1 className="heading mt-2 text-3xl font-semibold">
            {editId ? "Edit this meal" : "Check before saving"}
          </h1>
          <p className="mt-1 text-sm text-cocoa-600">
            Fix anything that isn&rsquo;t right — names, amounts, or what&rsquo;s in the meal.
          </p>
        </header>

        <Card>
          <DraftReview
            items={items}
            onChangeItem={changeItem}
            onRemoveItem={removeItem}
            mealName={mealName}
            onMealNameChange={setMealName}
            slot={slot}
            onSlotChange={setSlot}
            notes={notes}
            onNotesChange={setNotes}
            estimateNote={isEstimate ? estimateNote : null}
            onSave={save}
            saving={saving}
            saveLabel={editId ? "Save changes" : "Save meal"}
            onAddMore={() => setAddMoreOpen(true)}
            extra={
              entryMethod === "homemade" ? (
                <div className="rounded-xl bg-cream/80 px-3.5 py-2.5 text-[12.5px] text-cocoa-600">
                  Amounts below are already scaled to the {servingsEaten} serving
                  {servingsEaten === 1 ? "" : "s"} you ate out of {servings}.
                </div>
              ) : null
            }
          />
        </Card>

        <Modal
          open={addMoreOpen}
          onClose={() => setAddMoreOpen(false)}
          title="Add another food"
          size="md"
        >
          <div className="pb-2">
            <FoodSearchPanel
              autoFocus
              onPick={(food) => {
                addFood(food);
                setAddMoreOpen(false);
              }}
              onManualEntry={() => {
                setAddMoreOpen(false);
                setManualOpen(true);
              }}
            />
          </div>
        </Modal>

        <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Enter it yourself" size="md">
          <div className="pb-2">
            <ManualFoodForm
              onSubmit={(food, grams) => {
                addFood(food, grams);
                setManualOpen(false);
              }}
            />
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="heading text-3xl font-semibold">Add a meal</h1>
        <p className="mt-1 text-sm text-cocoa-600">
          Four ways in — pick whichever fits what you&rsquo;re eating.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`relative flex flex-col gap-1 rounded-2xl border p-3.5 text-left transition ${
              mode === m.key
                ? "border-transparent bg-cocoa-800 text-cream shadow-soft"
                : "border-cocoa-200 bg-white/70 text-cocoa-800 hover:border-caramel-300 hover:bg-white"
            }`}
          >
            <span className="text-lg" aria-hidden>{m.emoji}</span>
            <span className="text-[13px] font-semibold">{m.label}</span>
            <span className={`text-[11px] ${mode === m.key ? "text-cream/65" : "text-cocoa-500"}`}>
              {m.caption}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {mode === "photo" && (
            <PhotoScanner onConfirm={fromPhoto} onManualEntry={() => setMode("homemade")} />
          )}

          {mode === "barcode" && (
            <BarcodeScanner
              onFound={fromBarcode}
              onSearchInstead={(hint) => {
                setSearchSeed(hint ?? "");
                setMode("search");
              }}
              onManualEntry={() => setManualOpen(true)}
            />
          )}

          {mode === "homemade" && <HomeCookedForm onEstimated={fromRecipe} />}

          {mode === "search" && (
            <FoodSearchPanel
              autoFocus
              initialQuery={searchSeed}
              onPick={fromSearch}
              onManualEntry={() => setManualOpen(true)}
            />
          )}
        </motion.div>
      </Card>

      {items.length > 0 && (
        <Button fullWidth variant="secondary" onClick={() => setStep("review")}>
          Review {items.length} item{items.length === 1 ? "" : "s"} →
        </Button>
      )}

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Enter it yourself" size="md">
        <div className="pb-2">
          <ManualFoodForm
            onSubmit={(food, grams) => {
              addFood(food, grams);
              setManualOpen(false);
              setEstimateNote("You entered these values yourself.");
              setStep("review");
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
