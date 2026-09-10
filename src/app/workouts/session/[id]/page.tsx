import { notFound } from "next/navigation";
import { prisma, getCurrentUser } from "@/lib/db";
import { SessionLogger } from "@/components/workout/SessionLogger";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [session, exercises] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
      include: {
        exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
      },
    }),
    prisma.exercise.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!session) notFound();

  return (
    <SessionLogger
      session={{
        id: session.id,
        name: session.name,
        style: session.style,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        notes: session.notes,
        exercises: session.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          muscleGroups: parseList(ex.muscleGroups),
          order: ex.order,
          notes: ex.notes,
          completed: ex.completed,
          sets: ex.sets.map((s) => ({
            id: s.id,
            order: s.order,
            reps: s.reps,
            seconds: s.seconds,
            weight: s.weight,
            weightUnit: s.weightUnit,
            completed: s.completed,
          })),
        })),
      }}
      exerciseLibrary={exercises.map((e) => ({
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
