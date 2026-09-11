"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Shared "add to home screen" logic.
 *
 * Chrome and Edge fire `beforeinstallprompt`, which we hold onto and replay
 * when the person asks. Safari fires nothing and exposes no install API, so iOS
 * gets real instructions instead of a button that would silently do nothing.
 */

const DISMISS_KEY = "emberfit:install-dismissed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag for a home-screen app.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports as a Mac, but with a touch screen.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private mode can throw on storage access; treat it as "not dismissed".
    return false;
  }
}

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true); // assume until measured
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setDismissed(readDismissed());
    setReady(true);

    const onBeforeInstall = (event: Event) => {
      // Suppress the browser's own mini-infobar so ours is the only prompt.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const remember = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* it'll simply ask again next time */
    }
  }, []);

  /** Clears the dismissal, so the Profile entry point always works. */
  const forget = useCallback(() => {
    setDismissed(false);
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      /* nothing to undo */
    }
  }, []);

  /** Fires the real prompt where one exists. Returns false on iOS. */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "dismissed") remember();
    return choice.outcome === "accepted";
  }, [deferred, remember]);

  return {
    ready,
    installed,
    dismissed,
    canPrompt: deferred !== null,
    needsIosSteps: isIos() && !isStandalone(),
    promptInstall,
    remember,
    forget,
  };
}
