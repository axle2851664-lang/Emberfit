import { PrismaClient } from "@prisma/client";
import { EXERCISE_LIBRARY } from "../src/lib/data/exerciseLibrary";

/**
 * Seeds the built-in exercise library and a starter user.
 * Safe to re-run: exercises are matched by name.
 */
const prisma = new PrismaClient();

async function main() {
  let created = 0;
  for (const exercise of EXERCISE_LIBRARY) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name, userId: null },
    });
    const data = {
      name: exercise.name,
      muscleGroups: JSON.stringify(exercise.muscleGroups),
      equipment: JSON.stringify(exercise.equipment),
      category: exercise.category,
      instructions: exercise.instructions,
      isCustom: false,
      userId: null,
    };
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
    } else {
      await prisma.exercise.create({ data });
      created += 1;
    }
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    await prisma.user.create({ data: { name: "Athlete", profile: { create: {} } } });
    console.log("Created starter profile.");
  }

  console.log(`Exercise library ready — ${EXERCISE_LIBRARY.length} exercises (${created} new).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
