import { prisma, getCurrentUserId } from "@/lib/db";
import { createWorkout, type WorkoutInput } from "@/lib/services/workoutService";
import { fromResult, handler, jsonError, jsonOk, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const templatesOnly = url.searchParams.get("templates") === "1";

  const userId = await getCurrentUserId();
  const workouts = await prisma.workout.findMany({
    where: { userId, archivedAt: null, ...(templatesOnly ? { isTemplate: true } : {}) },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
    orderBy: [{ isTemplate: "desc" }, { updatedAt: "desc" }],
  });
  return jsonOk(workouts);
});

export const POST = handler(async (request: Request) => {
  const body = await readJson<WorkoutInput>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const userId = await getCurrentUserId();
  return fromResult(await createWorkout(userId, body), 201);
});
