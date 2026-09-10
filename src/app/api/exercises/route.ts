import { prisma, getCurrentUserId } from "@/lib/db";
import { createCustomExercise } from "@/lib/services/workoutService";
import { fromResult, handler, jsonError, jsonOk, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  const userId = await getCurrentUserId();
  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [{ OR: [{ userId }, { userId: null }] }, ...(q ? [{ name: { contains: q } }] : [])],
    },
    orderBy: [{ isCustom: "desc" }, { name: "asc" }],
  });
  return jsonOk(exercises);
});

interface Body {
  name?: string;
  muscleGroups?: string[];
  equipment?: string[];
  category?: string;
  instructions?: string;
}

export const POST = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const userId = await getCurrentUserId();
  return fromResult(
    await createCustomExercise(userId, {
      name: body.name ?? "",
      muscleGroups: body.muscleGroups ?? [],
      equipment: body.equipment ?? [],
      category: body.category ?? "strength",
      instructions: body.instructions,
    }),
    201,
  );
});
