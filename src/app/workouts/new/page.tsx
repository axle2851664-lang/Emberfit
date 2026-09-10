import { prisma, getCurrentUser } from "@/lib/db";
import { WorkoutEditor } from "@/components/workout/WorkoutEditor";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const user = await getCurrentUser();
  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: [{ isCustom: "desc" }, { name: "asc" }],
  });

  return (
    <WorkoutEditor
      workout={null}
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
