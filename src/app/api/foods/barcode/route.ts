import { getCurrentUserId } from "@/lib/db";
import { resolveScan } from "@/lib/services/barcodeService";
import { fromResult, handler, jsonError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Body {
  value?: string;
  format?: string;
}

export const POST = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  const value = body?.value?.trim();
  if (!value) {
    return jsonError({ code: "invalid_input", message: "No code was received.", hint: "Try scanning again, or type the number under the barcode." });
  }

  const userId = await getCurrentUserId();
  return fromResult(await resolveScan(userId, value, body?.format));
});
