/** Shared domain types. Kept free of Prisma imports so they can be used in
 *  client components without pulling the ORM into the browser bundle. */

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "core",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "full_body",
  "cardio",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  full_body: "Full body",
  cardio: "Cardio",
};

/** Coarse regions used by the recommendation engine to rotate emphasis. */
export const REGION_OF: Record<MuscleGroup, "upper" | "lower" | "core" | "cardio" | "full"> = {
  chest: "upper",
  back: "upper",
  shoulders: "upper",
  biceps: "upper",
  triceps: "upper",
  core: "core",
  quads: "lower",
  hamstrings: "lower",
  glutes: "lower",
  calves: "lower",
  full_body: "full",
  cardio: "cardio",
};

export const WORKOUT_STYLES = [
  "strength",
  "cardio",
  "mobility",
  "full_body",
  "conditioning",
  "beginner",
] as const;
export type WorkoutStyle = (typeof WORKOUT_STYLES)[number];

export const WORKOUT_STYLE_LABELS: Record<WorkoutStyle, string> = {
  strength: "Strength",
  cardio: "Cardio",
  mobility: "Mobility",
  full_body: "Full body",
  conditioning: "Sports conditioning",
  beginner: "Beginner",
};

export const EQUIPMENT = [
  "bodyweight",
  "dumbbells",
  "barbell",
  "kettlebell",
  "resistance_band",
  "pull_up_bar",
  "bench",
  "mat",
  "machine",
  "cardio_machine",
  "jump_rope",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: "Bodyweight",
  dumbbells: "Dumbbells",
  barbell: "Barbell",
  kettlebell: "Kettlebell",
  resistance_band: "Resistance band",
  pull_up_bar: "Pull-up bar",
  bench: "Bench",
  mat: "Mat",
  machine: "Machine",
  cardio_machine: "Cardio machine",
  jump_rope: "Jump rope",
};

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export const COOKING_METHODS = [
  "raw",
  "boiled",
  "steamed",
  "grilled",
  "baked",
  "roasted",
  "pan_fried",
  "deep_fried",
  "stewed",
  "air_fried",
] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];

export const COOKING_METHOD_LABELS: Record<CookingMethod, string> = {
  raw: "Raw / no cooking",
  boiled: "Boiled",
  steamed: "Steamed",
  grilled: "Grilled",
  baked: "Baked",
  roasted: "Roasted",
  pan_fried: "Pan-fried",
  deep_fried: "Deep-fried",
  stewed: "Stewed / simmered",
  air_fried: "Air-fried",
};

/** Nutrient totals. All grams except sodium (mg) and calories (kcal). */
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  satFat?: number | null;
  sodium?: number | null;
}

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  satFat: 0,
  sodium: 0,
};

/** A food as the UI sees it, independent of which provider produced it. */
export interface FoodResult {
  id?: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  source: "local" | "openfoodfacts" | "user" | "estimate";
  sourceId?: string | null;
  /** Per 100 g/ml. */
  per100: Nutrients;
  servingLabel?: string | null;
  servingGrams?: number | null;
  isEstimate?: boolean;
  confidence?: number | null;
}

/** One line inside a meal being composed. */
export interface DraftItem {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  per100: Nutrients;
  foodId?: string | null;
  isEstimate?: boolean;
  confidence?: number | null;
}

export interface PhotoCandidate {
  name: string;
  /** Best-guess portion in grams, always presented as adjustable. */
  estimatedGrams: number;
  confidence: number;
  /** Free text: how the model thinks it was prepared. */
  preparation?: string | null;
  per100?: Nutrients | null;
  matchedFoodName?: string | null;
}

export interface PhotoAnalysis {
  ok: boolean;
  provider: "anthropic" | "unavailable";
  mealNameGuess?: string | null;
  candidates: PhotoCandidate[];
  /** Present when analysis failed or degraded, so the UI can explain itself. */
  message?: string | null;
  /** Whether the caller should fall back to manual entry. */
  needsManualEntry?: boolean;
}

export interface ServiceError {
  code:
    | "not_found"
    | "offline"
    | "provider_error"
    | "invalid_input"
    | "not_configured"
    | "rate_limited"
    | "conflict";
  message: string;
  /** Human-facing next step. */
  hint?: string;
  /** Structured detail so the UI can offer a real choice, not just a message. */
  meta?: Record<string, unknown>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(
  code: ServiceError["code"],
  message: string,
  hint?: string,
  meta?: Record<string, unknown>,
): Result<T> {
  return { ok: false, error: { code, message, hint, meta } };
}

export function confidenceLabel(c: number | null | undefined): string {
  if (c == null) return "Estimate";
  if (c >= 0.75) return "Likely match";
  if (c >= 0.5) return "Possible match";
  return "Low confidence";
}
