/* eslint-disable no-restricted-globals */
/**
 * EmberFit service worker.
 *
 * Caching philosophy: this app is about knowing what you actually did and ate,
 * so showing yesterday's numbers as if they were today's would be worse than
 * showing nothing. Therefore:
 *
 *   - Static build output is cached hard (it is content-hashed and immutable).
 *   - Page navigations go to the network first, and fall back to an offline
 *     page — never to a stale snapshot of your dashboard.
 *   - API reads are never served from cache. When the network is gone they
 *     return the app's own offline error shape, so the UI shows its normal
 *     "you're offline" message with a next step rather than a dead screen.
 *   - Writes are never intercepted, so nothing can be silently lost or replayed.
 *
 * In development the caches are bypassed entirely, so you always see your
 * latest edit.
 */

const VERSION = "emberfit-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const OFFLINE_URL = "/offline.html";

// The minimum needed to render something useful with no network.
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/** Dev builds pass ?mode=development so we never serve a stale chunk. */
const MODE = new URL(self.location.href).searchParams.get("mode") || "production";
const IS_DEV = MODE === "development";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (!IS_DEV) {
        const cache = await caches.open(SHELL_CACHE);
        // Individually, so one 404 can't fail the whole install.
        await Promise.all(
          SHELL_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
          ),
        );
      }
      // Take over as soon as the user allows it (see the update prompt).
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("emberfit-") && !name.startsWith(VERSION))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** The app's standard error envelope, so the UI renders its usual message. */
function offlineApiResponse() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: "offline",
        message: "You're offline.",
        hint: "Reconnect and try again — nothing you've already saved is lost.",
      },
    }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    /\.(?:css|js|woff2?|png|jpe?g|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch writes: a queued or replayed POST could double-log a meal.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only our own origin. Third-party requests are left completely alone.
  if (url.origin !== self.location.origin) return;

  if (IS_DEV) return;

  // Next.js internals that must always be live.
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/__nextjs")) {
    return;
  }

  // 1. API reads: network only, with a graceful offline envelope.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => offlineApiResponse()));
    return;
  }

  // 2. Static build output: cache first, it's immutable and content-hashed.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(ASSET_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // An asset we've never seen and can't fetch; let it fail normally.
          return Response.error();
        }
      })(),
    );
    return;
  }

  // 3. Page navigations: network first, then the offline page. Deliberately
  //    never a cached copy of a data page — stale numbers would mislead.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response("You're offline.", {
              status: 503,
              headers: { "content-type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});

/** Lets the page tell a waiting worker to take over immediately. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/**
 * Notifications. EmberFit has no push server — these are local reminders the
 * app itself schedules — but handling the click means tapping one opens the
 * right screen rather than a blank tab.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});
