import { prisma } from "../db";
import { EXERCISE_LIBRARY } from "../data/exerciseLibrary";
import type { MuscleGroup, WorkoutStyle } from "../types";
import { REGION_OF, WORKOUT_STYLE_LABELS } from "../types";
import { parseList } from "../utils";

/**
 * RecommendationService — suggests what to train next.
 *
 * Design intent: rotate emphasis away from what was trained most recently,
 * respect the equipment and styles the user actually chose, and stay
 * conservative. It will happily suggest rest; it will never push volume.
 */

export interface RecommendedExercise {
  exerciseId: string | null;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  sets: number | null;
  reps: number | null;
  seconds: number | null;
  instructions: string | null;
}

export interface Recommendation {
  title: string;
  style: WorkoutStyle;
  focus: string;
  /** The plain-language "why this" shown under the heading. */
  reason: string;
  estimatedMinutes: number;
  exercises: RecommendedExercise[];
  /** Set when the honest suggestion is to take it easy. */
  restAdvised: boolean;
  note?: string | null;
}

const REGION_LABEL: Record<string, string> = {
  upper: "Upper body",
  lower: "Lower body",
  core: "Core & stability",
  cardio: "Easy cardio",
  full: "Full body",
};

export async function getRecommendation(userId: string): Promise<Recommendation> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const preferredStyles = parseList(profile?.preferredStyles) as WorkoutStyle[];
  const availableEquipment = parseList(profile?.equipment);
  const experience = profile?.experience ?? "beginner";
  const sessionMinutes = profile?.sessionMinutes ?? 40;
  const daysPerWeek = profile?.daysPerWeek ?? 4;

  const since = new Date();
  since.setDate(since.getDate() - 10);

  const recent = await prisma.workoutSession.findMany({
    where: { userId, status: "completed", completedAt: { gte: since } },
    include: { exercises: true },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  // --- Read the recent history ------------------------------------------------
  const now = Date.now();
  const regionLoad: Record<string, number> = { upper: 0, lower: 0, core: 0, cardio: 0, full: 0 };
  const recentExerciseNames = new Set<string>();

  for (const session of recent) {
    if (!session.completedAt) continue;
    const daysAgo = (now - session.completedAt.getTime()) / 86_400_000;
    // Recency weighting: yesterday counts far more than a week ago.
    const weight = Math.max(0, 1 - daysAgo / 7);
    for (const ex of session.exercises) {
      recentExerciseNames.add(ex.name.toLowerCase());
      for (const group of parseList(ex.muscleGroups) as MuscleGroup[]) {
        const region = REGION_OF[group];
        if (region) regionLoad[region] += weight;
        if (region === "full") {
          regionLoad.upper += weight * 0.5;
          regionLoad.lower += weight * 0.5;
        }
      }
    }
  }

  const sessionsLast7 = recent.filter(
    (s) => s.completedAt && now - s.completedAt.getTime() <= 7 * 86_400_000,
  ).length;
  const trainedToday = recent.some(
    (s) => s.completedAt && now - s.completedAt.getTime() <= 12 * 3600_000,
  );

  // --- Should we suggest rest? ------------------------------------------------
  // Two honest cases: already trained today, or well past the user's own weekly plan.
  if (trainedToday) {
    return restRecommendation(
      "You've already trained today",
      "Recovery is when the work pays off. If you want to move more, keep it gentle.",
      availableEquipment,
    );
  }
  if (sessionsLast7 >= daysPerWeek + 2) {
    return restRecommendation(
      "You've trained a lot this week",
      `That's ${sessionsLast7} sessions in 7 days, past the ${daysPerWeek} you planned. A mobility day is a good call.`,
      availableEquipment,
    );
  }

  // --- Pick the emphasis ------------------------------------------------------
  const candidates = ["upper", "lower", "core", "cardio"] as const;
  const leastTrained = [...candidates].sort((a, b) => regionLoad[a] - regionLoad[b])[0];
  const mostTrained = [...candidates].sort((a, b) => regionLoad[b] - regionLoad[a])[0];

  const hasHistory = recent.length > 0;
  const focus = hasHistory ? leastTrained : "full";

  // --- Pick the style ---------------------------------------------------------
  let style: WorkoutStyle = "full_body";
  if (focus === "cardio") style = "cardio";
  else if (focus === "core") style = "mobility";
  else style = "strength";

  // Honour the user's stated preferences where they're compatible.
  if (preferredStyles.length) {
    if (preferredStyles.includes(style)) {
      // already aligned
    } else if (focus === "cardio" && preferredStyles.includes("conditioning")) {
      style = "conditioning";
    } else if (!hasHistory && preferredStyles.includes("beginner")) {
      style = "beginner";
    } else {
      style = preferredStyles[0];
    }
  }
  if (experience === "beginner" && !preferredStyles.length && !hasHistory) style = "beginner";

  // --- Choose exercises -------------------------------------------------------
  const exercises = pickExercises({
    focus,
    style,
    experience,
    equipment: availableEquipment,
    avoid: recentExerciseNames,
    minutes: sessionMinutes,
  });

  const reason = buildReason({
    hasHistory,
    focus,
    mostTrained,
    sessionsLast7,
    style,
    regionLoad,
  });

  const resolved = await attachExerciseIds(userId, exercises);

  return {
    title: `${REGION_LABEL[focus] ?? "Full body"} — ${WORKOUT_STYLE_LABELS[style]}`,
    style,
    focus,
    reason,
    estimatedMinutes: Math.min(sessionMinutes, 15 + resolved.length * 6),
    exercises: resolved,
    restAdvised: false,
    note:
      experience === "beginner"
        ? "Start light and stop a couple of reps before it gets hard. Form first."
        : null,
  };
}

function restRecommendation(title: string, reason: string, equipment: string[]): Recommendation {
  const mobility = EXERCISE_LIBRARY.filter(
    (e) => e.category === "mobility" && isAvailable(e.equipment, equipment),
  ).slice(0, 5);

  return {
    title,
    style: "mobility",
    focus: "recovery",
    reason,
    estimatedMinutes: 15,
    restAdvised: true,
    note: "Nothing here should feel like effort. Skip it entirely if you'd rather rest.",
    exercises: mobility.map((e) => ({
      exerciseId: null,
      name: e.name,
      muscleGroups: e.muscleGroups,
      equipment: e.equipment,
      sets: e.defaultSets ?? 2,
      reps: e.defaultReps ?? null,
      seconds: e.defaultSeconds ?? null,
      instructions: e.instructions,
    })),
  };
}

function isAvailable(required: string[], owned: string[]): boolean {
  // Bodyweight and mat are assumed available; otherwise require an overlap.
  if (required.every((r) => r === "bodyweight" || r === "mat")) return true;
  if (!owned.length) return required.includes("bodyweight") || required.includes("mat");
  return required.some((r) => r === "bodyweight" || owned.includes(r));
}

function pickExercises(opts: {
  focus: string;
  style: WorkoutStyle;
  experience: string;
  equipment: string[];
  avoid: Set<string>;
  minutes: number;
}): RecommendedExercise[] {
  const { focus, style, experience, equipment, avoid, minutes } = opts;

  const targetCount = Math.max(4, Math.min(7, Math.round(minutes / 7)));

  const pool = EXERCISE_LIBRARY.filter((e) => {
    if (!isAvailable(e.equipment, equipment)) return false;
    if (experience === "beginner" && !e.beginnerFriendly) return false;
    return true;
  });

  const scored = pool.map((e) => {
    let score = 0;
    const regions = new Set(e.muscleGroups.map((g) => REGION_OF[g]));

    if (focus === "full") score += regions.has("full") ? 4 : 2;
    else if (regions.has(focus as any)) score += 5;
    else if (regions.has("full")) score += 2;

    // Style alignment.
    if (style === "cardio" && e.category === "cardio") score += 4;
    if (style === "mobility" && e.category === "mobility") score += 4;
    if (style === "conditioning" && e.category === "conditioning") score += 4;
    if (style === "strength" && e.category === "strength") score += 3;
    if (style === "full_body" && e.category === "strength") score += 2;
    if (style === "beginner" && e.beginnerFriendly) score += 3;

    // Freshness: nudge away from what was just done, don't ban it.
    if (avoid.has(e.name.toLowerCase())) score -= 2.5;

    return { exercise: e, score };
  });

  const chosen: typeof EXERCISE_LIBRARY = [];
  const usedGroups = new Map<string, number>();

  for (const { exercise, score } of scored.sort((a, b) => b.score - a.score)) {
    if (chosen.length >= targetCount) break;
    if (score <= 0) continue;
    // Spread the work: cap how often one muscle group repeats.
    const overloaded = exercise.muscleGroups.some((g) => (usedGroups.get(g) ?? 0) >= 2);
    if (overloaded) continue;
    chosen.push(exercise);
    for (const g of exercise.muscleGroups) usedGroups.set(g, (usedGroups.get(g) ?? 0) + 1);
  }

  // Always finish with something gentle.
  const cooldown = EXERCISE_LIBRARY.find(
    (e) => e.category === "mobility" && !chosen.includes(e) && isAvailable(e.equipment, equipment),
  );
  if (cooldown && chosen.length < targetCount + 1) chosen.push(cooldown);

  return chosen.map((e) => ({
    exerciseId: null,
    name: e.name,
    muscleGroups: e.muscleGroups,
    equipment: e.equipment,
    sets: e.defaultSets ?? (e.defaultSeconds ? 1 : 3),
    reps: e.defaultReps ?? null,
    seconds: e.defaultSeconds ?? null,
    instructions: e.instructions,
  }));
}

function buildReason(opts: {
  hasHistory: boolean;
  focus: string;
  mostTrained: string;
  sessionsLast7: number;
  style: WorkoutStyle;
  regionLoad: Record<string, number>;
}): string {
  const { hasHistory, focus, mostTrained, sessionsLast7, regionLoad } = opts;

  if (!hasHistory) {
    return "You haven't logged a workout yet, so here's a balanced full-body session to start from. Adjust anything that doesn't suit you.";
  }

  const focusLabel = (REGION_LABEL[focus] ?? "Full body").toLowerCase();
  const mostLabel = (REGION_LABEL[mostTrained] ?? "").toLowerCase();

  if (regionLoad[mostTrained] > 0 && mostTrained !== focus) {
    return `You trained ${mostLabel} recently, so this leans ${focusLabel} to even things out. ${sessionsLast7} session${sessionsLast7 === 1 ? "" : "s"} in the last week.`;
  }
  return `Based on your last ${sessionsLast7} session${sessionsLast7 === 1 ? "" : "s"}, ${focusLabel} has had the least attention lately.`;
}

/**
 * Match recommended exercises to real rows so the suggestion can be saved as a
 * workout in one tap.
 */
async function attachExerciseIds(
  userId: string,
  exercises: RecommendedExercise[],
): Promise<RecommendedExercise[]> {
  if (!exercises.length) return exercises;
  const rows = await prisma.exercise.findMany({
    where: { name: { in: exercises.map((e) => e.name) }, OR: [{ userId }, { userId: null }] },
    select: { id: true, name: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r.id]));
  return exercises.map((e) => ({ ...e, exerciseId: byName.get(e.name) ?? null }));
}
