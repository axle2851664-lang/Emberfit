import { getCurrentUserId } from "@/lib/db";
import { getRecommendation } from "@/lib/services/recommendationService";
import { handler, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const userId = await getCurrentUserId();
  return jsonOk(await getRecommendation(userId));
});
