import { notFound } from "next/navigation";
import { prisma, getCurrentUser } from "@/lib/db";
import { WorkoutEditor } from "@/components/workout/WorkoutEditor";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [workout, exercises] = await Promise.all([
    prisma.workout.findFirst({
      where: { id, userId: user.id },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    prisma.exercise.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!workout) notFound();

  return (
    <WorkoutEditor
      workout={{
        id: workout.id,
        name: workout.name,
        description: workout.description,
        style: workout.style,
        isTemplate: workout.isTemplate,
        estimatedMinutes: workout.estimatedMinutes,
        scheduledFor: workout.scheduledFor?.toISOString() ?? null,
        updatedAt: workout.updatedAt.toISOString(),
        exercises: workout.exercises.map((we) => ({
          id: we.id,
          exerciseId: we.exerciseId,
          name: we.exercise.name,
          muscleGroups: parseList(we.exercise.muscleGroups),
          targetSets: we.targetSets,
          targetReps: we.targetReps,
          targetSeconds: we.targetSeconds,
        })),
      }}
      exercises={exercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroups: parseList(e.muscleGroups),
        equipment: parseList(e.equipment),
        category: e.category,
        instructions: e.instructions,
        isCustom: e.isCustom,
      }))}
    />
  );
}
