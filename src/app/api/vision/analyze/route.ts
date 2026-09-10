import { getCurrentUserId } from "@/lib/db";
import { analyzePhoto, visionAvailable } from "@/lib/services/visionService";
import { fromResult, handler, jsonError, readJson } from "@/lib/api";

/**
 * Photo analysis runs server-side only. The image is held in memory for the
 * length of the request and never written to disk.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  image?: string; // data URL or bare base64
  mediaType?: string;
}

export const GET = handler(async () =>
  Response.json({ ok: true, data: { available: visionAvailable() } }),
);

export const POST = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  if (!body?.image) {
    return jsonError({ code: "invalid_input", message: "No photo was received.", hint: "Pick a photo and try again." });
  }

  let base64 = body.image;
  let mediaType = body.mediaType ?? "image/jpeg";

  const dataUrl = base64.match(/^data:([^;]+);base64,(.*)$/s);
  if (dataUrl) {
    mediaType = dataUrl[1];
    base64 = dataUrl[2];
  }

  const userId = await getCurrentUserId();
  return fromResult(await analyzePhoto(userId, base64, mediaType));
});
