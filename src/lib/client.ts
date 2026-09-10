"use client";

import type { ServiceError } from "./types";

/**
 * Typed fetch wrapper for the app's own API. Every failure — network, HTTP, or
 * a service-level error — comes back in the same shape so screens can render a
 * useful message instead of a blank state.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export async function api<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const { timeoutMs = 60_000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // A non-JSON response is still a failure we can describe.
    }

    if (body && typeof body.ok === "boolean") {
      return body as ApiResult<T>;
    }

    return {
      ok: false,
      error: {
        code: "provider_error",
        message: `The server responded with ${res.status}.`,
        hint: "Try again in a moment.",
      },
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return {
      ok: false,
      error: {
        code: "offline",
        message: offline
          ? "You're offline."
          : aborted
            ? "That took too long."
            : "Couldn't reach the server.",
        hint: offline
          ? "Reconnect and try again — nothing you've already saved is lost."
          : "Try again in a moment.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export const apiGet = <T>(path: string) => api<T>(path);

export const apiPost = <T>(path: string, body: unknown, timeoutMs?: number) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body), timeoutMs });

export const apiPut = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
