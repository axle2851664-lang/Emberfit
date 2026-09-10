import { prisma, getCurrentUserId } from "@/lib/db";
import { getActiveSession, startSession } from "@/lib/services/workoutService";
import { fromResult, handler, jsonOk, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const userId = await getCurrentUserId();

  if (url.searchParams.get("active") === "1") {
    return jsonOk(await getActiveSession(userId));
  }

  const take = Math.min(100, Number(url.searchParams.get("limit") ?? 30) || 30);
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: "completed" },
    include: {
      exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
    orderBy: { completedAt: "desc" },
    take,
  });
  return jsonOk(sessions);
});

interface Body {
  workoutId?: string | null;
  name?: string;
  /** Set once the person has confirmed discarding an unfinished session. */
  force?: boolean;
}

export const POST = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  const userId = await getCurrentUserId();
  return fromResult(
    await startSession(userId, body?.workoutId ?? null, body?.name, { force: body?.force === true }),
    201,
  );
});
