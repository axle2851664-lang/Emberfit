import { Suspense } from "react";
import { prisma, getCurrentUser } from "@/lib/db";
import { getTrainingStats } from "@/lib/services/workoutService";
import { getDailyTotals } from "@/lib/services/mealService";
import { HistoryClient } from "@/components/HistoryClient";
import { LoadingCard } from "@/components/ui/States";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();

  const [sessions, stats, nutritionDays] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: "completed" },
      include: {
        exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
      },
      orderBy: { completedAt: "desc" },
      take: 60,
    }),
    getTrainingStats(user.id, 84),
    getDailyTotals(user.id, 30),
  ]);

  return (
    <Suspense fallback={<LoadingCard lines={6} />}>
      <HistoryClient
        stats={stats}
        nutritionDays={nutritionDays}
        sessions={sessions.map((session) => ({
          id: session.id,
          name: session.name,
          style: session.style,
          completedAt: (session.completedAt ?? session.startedAt).toISOString(),
          durationSeconds: session.durationSeconds,
          notes: session.notes,
          perceivedEffort: session.perceivedEffort,
          exercises: session.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            muscleGroups: parseList(ex.muscleGroups),
            completed: ex.completed,
            notes: ex.notes,
            sets: ex.sets.map((s) => ({
              id: s.id,
              reps: s.reps,
              seconds: s.seconds,
              weight: s.weight,
              weightUnit: s.weightUnit,
              completed: s.completed,
            })),
          })),
        }))}
      />
    </Suspense>
  );
}
