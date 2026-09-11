import { jsonOk } from "@/lib/api";

/**
 * Liveness check. Deliberately touches nothing — no database, no providers — so
 * it answers even when something downstream is unwell, and so the offline page
 * can use it to ask "is the app actually reachable?" rather than trusting
 * navigator.onLine, which only knows whether there is a network at all.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return jsonOk({ status: "ok", time: new Date().toISOString() });
}
