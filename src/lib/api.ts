import { NextResponse } from "next/server";
import type { Result, ServiceError } from "./types";

/**
 * Consistent JSON envelope for every route, so the client has exactly one
 * error shape to render.
 */

const STATUS_BY_CODE: Record<ServiceError["code"], number> = {
  not_found: 404,
  invalid_input: 400,
  not_configured: 503,
  offline: 503,
  provider_error: 502,
  rate_limited: 429,
  conflict: 409,
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(error: ServiceError, status?: number) {
  return NextResponse.json(
    { ok: false, error },
    { status: status ?? STATUS_BY_CODE[error.code] ?? 400 },
  );
}

export function fromResult<T>(result: Result<T>, successStatus = 200) {
  return result.ok ? jsonOk(result.data, successStatus) : jsonError(result.error);
}

/** Wrap a handler so an unexpected throw still returns a usable message. */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error("[api] unhandled error", e);
      return jsonError({
        code: "provider_error",
        message: "Something went wrong on our side.",
        hint: "Try again — if it keeps happening, your data is still safe.",
      });
    }
  };
}

/** Parse a JSON body, returning null (never throwing) on malformed input. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
