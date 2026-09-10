import { prisma, getCurrentUserId } from "@/lib/db";
import { deleteWorkout, updateWorkout, type WorkoutInput } from "@/lib/services/workoutService";
import { fromResult, handler, jsonError, jsonOk, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const workout = await prisma.workout.findFirst({
    where: { id, userId },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!workout) return jsonError({ code: "not_found", message: "That workout no longer exists." });
  return jsonOk(workout);
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await readJson<WorkoutInput>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const userId = await getCurrentUserId();
  return fromResult(await updateWorkout(userId, id, body));
});

export const DELETE = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  return fromResult(await deleteWorkout(userId, id));
});
