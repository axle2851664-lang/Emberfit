import { getCurrentUserId } from "@/lib/db";
import { deleteCustomExercise } from "@/lib/services/workoutService";
import { fromResult, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const userId = await getCurrentUserId();
  return fromResult(await deleteCustomExercise(userId, id));
});
