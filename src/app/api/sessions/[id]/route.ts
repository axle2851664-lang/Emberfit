import { prisma, getCurrentUserId } from "@/lib/db";
import { abandonSession, completeSession, deleteSession } from "@/lib/services/workoutService";
import { fromResult, handler, jsonError, jsonOk, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    include: {
      exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
  if (!session) return jsonError({ code: "not_found", message: "That session no longer exists." });
  return jsonOk(session);
});

interface PatchBody {
  action?: "complete" | "abandon";
  durationSeconds?: number;
  notes?: string | null;
  perceivedEffort?: number | null;
}

export const PATCH = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await readJson<PatchBody>(request);
  const userId = await getCurrentUserId();

  if (body?.action === "abandon") {
    return fromResult(await abandonSession(userId, id));
  }
  return fromResult(
    await completeSession(userId, id, {
      durationSeconds: body?.durationSeconds,
      notes: body?.notes ?? null,
      perceivedEffort: body?.perceivedEffort ?? null,
    }),
  );
});

export const DELETE = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  return fromResult(await deleteSession(userId, id));
});
