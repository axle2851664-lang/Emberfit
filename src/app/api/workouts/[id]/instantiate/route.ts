import { getCurrentUserId } from "@/lib/db";
import { instantiateTemplate } from "@/lib/services/workoutService";
import { fromResult, handler, readJson } from "@/lib/api";

/**
 * Turn a template into a real, dated workout, leaving the template itself
 * untouched so it can be reused again tomorrow.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

interface Body {
  /** ISO date to plan it for. Defaults to today. */
  scheduledFor?: string | null;
}

export const POST = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await readJson<Body>(request);
  const userId = await getCurrentUserId();
  return fromResult(await instantiateTemplate(userId, id, body?.scheduledFor ?? null), 201);
});
