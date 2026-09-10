import { getCurrentUserId } from "@/lib/db";
import { searchFoods } from "@/lib/services/foodService";
import { fromResult, handler, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const includeRemote = url.searchParams.get("remote") !== "0";

  if (query.trim().length < 2) {
    return jsonError({ code: "invalid_input", message: "Type at least two characters to search." });
  }

  const userId = await getCurrentUserId();
  return fromResult(await searchFoods(userId, query, { includeRemote }));
});
