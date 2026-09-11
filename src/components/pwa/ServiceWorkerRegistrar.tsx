"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Registers the service worker and offers the update rather than forcing it.
 *
 * A silent auto-reload in the middle of logging a set is a good way to lose
 * someone's work, so a new version waits until it's asked for.
 */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // The worker is told which mode it's running under so it can skip caching
    // in development instead of serving stale chunks.
    const mode = process.env.NODE_ENV === "production" ? "production" : "development";
    const url = `/sw.js?mode=${mode}`;

    let registration: ServiceWorkerRegistration | undefined;

    const onUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // "installed" with an existing controller means this is an update,
        // not the very first install.
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(installing);
        }
      });
    };

    navigator.serviceWorker
      .register(url, { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", onUpdateFound);
      })
      .catch((error) => {
        // Registration fails on insecure origins and in some private modes.
        // The app works perfectly well without it, so this is not user-facing.
        console.info("[pwa] service worker not registered:", error?.message ?? error);
      });

    return () => registration?.removeEventListener("updatefound", onUpdateFound);
  }, []);

  const applyUpdate = () => {
    if (!waiting) return;
    waiting.postMessage("SKIP_WAITING");
    // The new worker takes control, then we reload once into it.
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    setWaiting(null);
  };

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          className="fixed inset-x-4 bottom-24 z-[85] mx-auto max-w-sm rounded-2xl border border-cocoa-200 bg-white p-4 shadow-lift sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          <p className="text-sm font-semibold text-cocoa-900">A new version is ready</p>
          <p className="mt-1 text-[12.5px] leading-snug text-cocoa-600">
            It&rsquo;ll be applied next time you open the app, or you can update now.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={applyUpdate}>
              Update now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWaiting(null)}>
              Later
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
