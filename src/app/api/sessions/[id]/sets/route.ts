import { prisma, getCurrentUserId } from "@/lib/db";
import { handler, jsonError, jsonOk, readJson } from "@/lib/api";
import { clamp } from "@/lib/utils";

/**
 * Set-level edits during a live workout: add, update or remove a set, and add
 * an exercise to a session that's already running.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

interface Body {
  action: "add_set" | "update_set" | "remove_set" | "add_exercise" | "update_exercise";
  sessionExerciseId?: string;
  setId?: string;
  exerciseId?: string;
  reps?: number | null;
  seconds?: number | null;
  weight?: number | null;
  weightUnit?: string;
  completed?: boolean;
  notes?: string | null;
}

export const POST = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const session = await prisma.workoutSession.findFirst({ where: { id, userId } });
  if (!session) return jsonError({ code: "not_found", message: "That session no longer exists." });
  if (session.status !== "in_progress") {
    return jsonError({ code: "invalid_input", message: "That workout is already finished.", hint: "Start a new one to keep training." });
  }

  const body = await readJson<Body>(request);
  if (!body?.action) return jsonError({ code: "invalid_input", message: "Nothing to do." });

  // Every write is scoped to this session, so ids can't be used to reach across.
  const ownsExercise = async (sessionExerciseId: string) =>
    Boolean(await prisma.sessionExercise.findFirst({ where: { id: sessionExerciseId, sessionId: id } }));

  switch (body.action) {
    case "add_exercise": {
      if (!body.exerciseId) return jsonError({ code: "invalid_input", message: "Pick an exercise to add." });
      const exercise = await prisma.exercise.findFirst({
        where: { id: body.exerciseId, OR: [{ userId }, { userId: null }] },
      });
      if (!exercise) return jsonError({ code: "not_found", message: "That exercise couldn't be found." });

      const count = await prisma.sessionExercise.count({ where: { sessionId: id } });
      const created = await prisma.sessionExercise.create({
        data: {
          sessionId: id,
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          order: count,
          sets: { create: [{ order: 0, completed: false }] },
        },
        include: { sets: true },
      });
      return jsonOk(created, 201);
    }

    case "add_set": {
      if (!body.sessionExerciseId || !(await ownsExercise(body.sessionExerciseId))) {
        return jsonError({ code: "not_found", message: "That exercise isn't part of this workout." });
      }
      const count = await prisma.workoutSet.count({ where: { sessionExerciseId: body.sessionExerciseId } });
      const last = await prisma.workoutSet.findFirst({
        where: { sessionExerciseId: body.sessionExerciseId },
        orderBy: { order: "desc" },
      });
      const created = await prisma.workoutSet.create({
        data: {
          sessionExerciseId: body.sessionExerciseId,
          order: count,
          // Carry the last set forward — it's almost always what you want next.
          reps: body.reps ?? last?.reps ?? null,
          seconds: body.seconds ?? last?.seconds ?? null,
          weight: body.weight ?? last?.weight ?? null,
          weightUnit: body.weightUnit ?? last?.weightUnit ?? "kg",
          completed: false,
        },
      });
      return jsonOk(created, 201);
    }

    case "update_set": {
      if (!body.setId) return jsonError({ code: "invalid_input", message: "No set was specified." });
      const set = await prisma.workoutSet.findFirst({
        where: { id: body.setId, sessionExercise: { sessionId: id } },
      });
      if (!set) return jsonError({ code: "not_found", message: "That set isn't part of this workout." });

      const updated = await prisma.workoutSet.update({
        where: { id: set.id },
        data: {
          reps: body.reps === undefined ? set.reps : body.reps == null ? null : clamp(Math.round(body.reps), 0, 1000),
          seconds: body.seconds === undefined ? set.seconds : body.seconds == null ? null : clamp(Math.round(body.seconds), 0, 36_000),
          weight: body.weight === undefined ? set.weight : body.weight == null ? null : clamp(body.weight, 0, 1000),
          weightUnit: body.weightUnit ?? set.weightUnit,
          completed: body.completed ?? set.completed,
          notes: body.notes === undefined ? set.notes : body.notes,
        },
      });
      return jsonOk(updated);
    }

    case "remove_set": {
      if (!body.setId) return jsonError({ code: "invalid_input", message: "No set was specified." });
      const set = await prisma.workoutSet.findFirst({
        where: { id: body.setId, sessionExercise: { sessionId: id } },
      });
      if (!set) return jsonError({ code: "not_found", message: "That set has already been removed." });
      await prisma.workoutSet.delete({ where: { id: set.id } });
      return jsonOk(null);
    }

    case "update_exercise": {
      if (!body.sessionExerciseId || !(await ownsExercise(body.sessionExerciseId))) {
        return jsonError({ code: "not_found", message: "That exercise isn't part of this workout." });
      }
      const updated = await prisma.sessionExercise.update({
        where: { id: body.sessionExerciseId },
        data: { notes: body.notes ?? null, completed: body.completed ?? undefined },
      });
      return jsonOk(updated);
    }

    default:
      return jsonError({ code: "invalid_input", message: "Unknown action." });
  }
});
