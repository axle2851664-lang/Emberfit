import { Suspense } from "react";
import { prisma, getCurrentUser } from "@/lib/db";
import { getActiveSession } from "@/lib/services/workoutService";
import { WorkoutsClient } from "@/components/workout/WorkoutsClient";
import { LoadingCard } from "@/components/ui/States";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const user = await getCurrentUser();

  const [workouts, exercises, activeSession] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.exercise.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    }),
    getActiveSession(user.id),
  ]);

  const plainWorkouts = workouts.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    style: w.style,
    isTemplate: w.isTemplate,
    estimatedMinutes: w.estimatedMinutes,
    scheduledFor: w.scheduledFor?.toISOString() ?? null,
    updatedAt: w.updatedAt.toISOString(),
    exercises: w.exercises.map((we) => ({
      id: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.name,
      muscleGroups: parseList(we.exercise.muscleGroups),
      targetSets: we.targetSets,
      targetReps: we.targetReps,
      targetSeconds: we.targetSeconds,
    })),
  }));

  const plainExercises = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroups: parseList(e.muscleGroups),
    equipment: parseList(e.equipment),
    category: e.category,
    instructions: e.instructions,
    isCustom: e.isCustom,
  }));

  return (
    <Suspense fallback={<LoadingCard lines={5} />}>
      <WorkoutsClient
        workouts={plainWorkouts}
        exercises={plainExercises}
        activeSessionId={activeSession?.id ?? null}
      />
    </Suspense>
  );
}
