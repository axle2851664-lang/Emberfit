import { prisma } from "../db";
import type { Result, WorkoutStyle } from "../types";
import { err, ok } from "../types";
import { dayKey, parseList, stringifyList } from "../utils";

/**
 * WorkoutService — planning, running and recording training.
 *
 * A Workout is the plan; a WorkoutSession is one performance of it. Sessions
 * denormalise the names they need so history survives deleting the plan.
 */

export interface WorkoutExerciseInput {
  exerciseId: string;
  targetSets?: number | null;
  targetReps?: number | null;
  targetSeconds?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface WorkoutInput {
  name: string;
  description?: string | null;
  style: WorkoutStyle;
  isTemplate?: boolean;
  scheduledFor?: string | null;
  estimatedMinutes?: number;
  exercises: WorkoutExerciseInput[];
}

export async function createWorkout(userId: string, input: WorkoutInput): Promise<Result<{ id: string }>> {
  if (!input.name?.trim()) return err("invalid_input", "Give the workout a name.");
  if (!input.exercises?.length) {
    return err("invalid_input", "A workout needs at least one exercise.", "Add an exercise from the library, or create your own.");
  }

  // Guard against exercises that don't exist / belong to someone else.
  const valid = await validExerciseIds(userId, input.exercises.map((e) => e.exerciseId));
  const exercises = input.exercises.filter((e) => valid.has(e.exerciseId));
  if (!exercises.length) return err("invalid_input", "None of those exercises could be found.");

  const workout = await prisma.workout.create({
    data: {
      userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      style: input.style,
      isTemplate: input.isTemplate ?? false,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      estimatedMinutes: input.estimatedMinutes ?? 40,
      exercises: {
        create: exercises.map((e, index) => ({
          exerciseId: e.exerciseId,
          order: index,
          targetSets: e.targetSets ?? null,
          targetReps: e.targetReps ?? null,
          targetSeconds: e.targetSeconds ?? null,
          restSeconds: e.restSeconds ?? null,
          notes: e.notes?.trim() || null,
        })),
      },
    },
  });

  return ok({ id: workout.id });
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  input: WorkoutInput,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
  if (!existing) return err("not_found", "That workout no longer exists.");
  if (!input.exercises?.length) return err("invalid_input", "A workout needs at least one exercise.");

  const valid = await validExerciseIds(userId, input.exercises.map((e) => e.exerciseId));
  const exercises = input.exercises.filter((e) => valid.has(e.exerciseId));
  if (!exercises.length) return err("invalid_input", "None of those exercises could be found.");

  await prisma.$transaction([
    prisma.workoutExercise.deleteMany({ where: { workoutId } }),
    prisma.workout.update({
      where: { id: workoutId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        style: input.style,
        isTemplate: input.isTemplate ?? existing.isTemplate,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        estimatedMinutes: input.estimatedMinutes ?? existing.estimatedMinutes,
        exercises: {
          create: exercises.map((e, index) => ({
            exerciseId: e.exerciseId,
            order: index,
            targetSets: e.targetSets ?? null,
            targetReps: e.targetReps ?? null,
            targetSeconds: e.targetSeconds ?? null,
            restSeconds: e.restSeconds ?? null,
            notes: e.notes?.trim() || null,
          })),
        },
      },
    }),
  ]);

  return ok({ id: workoutId });
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<Result<null>> {
  const existing = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
  if (!existing) return err("not_found", "That workout has already been removed.");
  // Sessions keep their denormalised name and set data; only the link is cleared.
  await prisma.workout.delete({ where: { id: workoutId } });
  return ok(null);
}

async function validExerciseIds(userId: string, ids: string[]): Promise<Set<string>> {
  const rows = await prisma.exercise.findMany({
    where: { id: { in: ids }, OR: [{ userId }, { userId: null }] },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/**
 * Start a session from a plan, pre-filling the prescribed sets.
 *
 * Only one session can be live at a time. If one is already running we resume
 * it when it's the same workout, and otherwise refuse with a `conflict` so the
 * caller can ask what the person actually wants — silently swapping in a
 * different workout loses their unfinished sets.
 */
export async function startSession(
  userId: string,
  workoutId: string | null,
  fallbackName = "Quick workout",
  options: { force?: boolean } = {},
): Promise<Result<{ id: string; resumed: boolean }>> {
  const live = await prisma.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
  });

  if (live) {
    // Same workout (or the same freestyle intent) — just carry on.
    if (live.workoutId === workoutId) return ok({ id: live.id, resumed: true });

    if (!options.force) {
      const loggedSets = await prisma.workoutSet.count({
        where: { sessionExercise: { sessionId: live.id }, completed: true },
      });
      return err(
        "conflict",
        `You already have "${live.name}" in progress.`,
        loggedSets > 0
          ? `It has ${loggedSets} set${loggedSets === 1 ? "" : "s"} logged. Resume it, or discard it and start this one instead.`
          : "Nothing is logged in it yet. Resume it, or discard it and start this one instead.",
        { activeSessionId: live.id, activeSessionName: live.name, loggedSets },
      );
    }

    // The person chose to drop it.
    await prisma.workoutSession.update({
      where: { id: live.id },
      data: { status: "abandoned" },
    });
  }

  if (!workoutId) {
    const created = await prisma.workoutSession.create({
      data: { userId, name: fallbackName, style: "strength", status: "in_progress" },
    });
    return ok({ id: created.id, resumed: false });
  }

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!workout) return err("not_found", "That workout no longer exists.");
  if (!workout.exercises.length) {
    return err("invalid_input", "That workout has no exercises yet.", "Add an exercise to it first.");
  }

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      workoutId: workout.id,
      name: workout.name,
      style: workout.style,
      status: "in_progress",
      exercises: {
        create: workout.exercises.map((we, index) => ({
          exerciseId: we.exerciseId,
          name: we.exercise.name,
          muscleGroups: we.exercise.muscleGroups,
          order: index,
          notes: we.notes,
          sets: {
            create: Array.from({ length: we.targetSets ?? 3 }, (_, i) => ({
              order: i,
              reps: we.targetReps ?? null,
              seconds: we.targetSeconds ?? null,
              completed: false,
            })),
          },
        })),
      },
    },
  });

  return ok({ id: session.id, resumed: false });
}

export async function getActiveSession(userId: string) {
  return prisma.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    include: {
      exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function completeSession(
  userId: string,
  sessionId: string,
  data: { durationSeconds?: number; notes?: string | null; perceivedEffort?: number | null },
): Promise<Result<{ id: string }>> {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) return err("not_found", "That session no longer exists.");
  if (session.status === "completed") return ok({ id: sessionId });

  const completedAt = new Date();
  const elapsed =
    data.durationSeconds ??
    Math.max(1, Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000));

  // Mark an exercise complete if any of its sets were ticked off.
  const updates = session.exercises.map((ex) =>
    prisma.sessionExercise.update({
      where: { id: ex.id },
      data: { completed: ex.sets.some((s) => s.completed) },
    }),
  );

  await prisma.$transaction([
    ...updates,
    prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        completedAt,
        durationSeconds: elapsed,
        notes: data.notes?.trim() || null,
        perceivedEffort: data.perceivedEffort ?? null,
      },
    }),
  ]);

  return ok({ id: sessionId });
}

export async function abandonSession(userId: string, sessionId: string): Promise<Result<null>> {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return err("not_found", "That session no longer exists.");
  await prisma.workoutSession.update({ where: { id: sessionId }, data: { status: "abandoned" } });
  return ok(null);
}

export async function deleteSession(userId: string, sessionId: string): Promise<Result<null>> {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return err("not_found", "That session has already been removed.");
  await prisma.workoutSession.delete({ where: { id: sessionId } });
  return ok(null);
}

/** Today's plan: a workout scheduled for today, if any. */
export async function getTodaysWorkout(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const workout = await prisma.workout.findFirst({
    where: { userId, archivedAt: null, scheduledFor: { gte: start, lt: end } },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!workout) return null;

  const completedToday = await prisma.workoutSession.findFirst({
    where: { userId, workoutId: workout.id, status: "completed", completedAt: { gte: start, lt: end } },
  });

  return { workout, completed: Boolean(completedToday), session: completedToday };
}

export interface TrainingStats {
  totalSessions: number;
  last7: number;
  last30: number;
  currentStreakDays: number;
  totalMinutes: number;
  byDay: Array<{ dayKey: string; count: number; minutes: number }>;
  muscleGroupCounts: Record<string, number>;
}

export async function getTrainingStats(userId: string, days = 84): Promise<TrainingStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: "completed", completedAt: { gte: since } },
    include: { exercises: true },
    orderBy: { completedAt: "desc" },
  });

  const totalSessions = await prisma.workoutSession.count({ where: { userId, status: "completed" } });

  const now = Date.now();
  const within = (d: number) =>
    sessions.filter((s) => s.completedAt && now - s.completedAt.getTime() <= d * 86_400_000).length;

  const byDayMap = new Map<string, { count: number; minutes: number }>();
  const muscleGroupCounts: Record<string, number> = {};
  let totalMinutes = 0;

  for (const s of sessions) {
    if (!s.completedAt) continue;
    const key = dayKey(s.completedAt);
    const entry = byDayMap.get(key) ?? { count: 0, minutes: 0 };
    entry.count += 1;
    const minutes = Math.round((s.durationSeconds ?? 0) / 60);
    entry.minutes += minutes;
    totalMinutes += minutes;
    byDayMap.set(key, entry);

    for (const ex of s.exercises) {
      for (const group of parseList(ex.muscleGroups)) {
        muscleGroupCounts[group] = (muscleGroupCounts[group] ?? 0) + 1;
      }
    }
  }

  // Streak: consecutive days with a completed session, allowing today to be empty.
  const trainedDays = new Set(byDayMap.keys());
  let streak = 0;
  const cursor = new Date();
  if (!trainedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (trainedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalSessions,
    last7: within(7),
    last30: within(30),
    currentStreakDays: streak,
    totalMinutes,
    byDay: Array.from(byDayMap.entries())
      .map(([key, v]) => ({ dayKey: key, ...v }))
      .sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1)),
    muscleGroupCounts,
  };
}

/** Create a fresh workout from a template, keeping the template intact. */
export async function instantiateTemplate(
  userId: string,
  templateId: string,
  scheduledFor?: string | null,
): Promise<Result<{ id: string }>> {
  const template = await prisma.workout.findFirst({
    where: { id: templateId, userId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!template) return err("not_found", "That template no longer exists.");

  const created = await prisma.workout.create({
    data: {
      userId,
      name: template.name,
      description: template.description,
      style: template.style,
      isTemplate: false,
      estimatedMinutes: template.estimatedMinutes,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      exercises: {
        create: template.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          order: e.order,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetSeconds: e.targetSeconds,
          restSeconds: e.restSeconds,
          notes: e.notes,
        })),
      },
    },
  });
  return ok({ id: created.id });
}

export async function createCustomExercise(
  userId: string,
  input: {
    name: string;
    muscleGroups: string[];
    equipment: string[];
    category: string;
    instructions?: string | null;
  },
): Promise<Result<{ id: string }>> {
  const name = input.name?.trim();
  if (!name) return err("invalid_input", "Give the exercise a name.");
  if (!input.muscleGroups?.length) {
    return err("invalid_input", "Pick at least one muscle group.", "This is what lets the app rotate your training sensibly.");
  }

  const duplicate = await prisma.exercise.findFirst({
    where: { name, OR: [{ userId }, { userId: null }] },
  });
  if (duplicate) {
    return err("invalid_input", `You already have an exercise called "${name}".`, "Use the existing one, or pick a different name.");
  }

  const created = await prisma.exercise.create({
    data: {
      name,
      muscleGroups: stringifyList(input.muscleGroups),
      equipment: stringifyList(input.equipment),
      category: input.category || "strength",
      instructions: input.instructions?.trim() || null,
      isCustom: true,
      userId,
    },
  });
  return ok({ id: created.id });
}

export async function deleteCustomExercise(userId: string, exerciseId: string): Promise<Result<null>> {
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, userId, isCustom: true } });
  if (!exercise) return err("not_found", "That exercise isn't one of yours to delete.");

  // WorkoutExercise restricts deletes, so tell the user rather than failing hard.
  const inUse = await prisma.workoutExercise.count({ where: { exerciseId } });
  if (inUse > 0) {
    return err(
      "invalid_input",
      `That exercise is used in ${inUse} workout${inUse === 1 ? "" : "s"}.`,
      "Remove it from those workouts first, or keep it — past sessions will still read fine.",
    );
  }

  await prisma.exercise.delete({ where: { id: exerciseId } });
  return ok(null);
}
