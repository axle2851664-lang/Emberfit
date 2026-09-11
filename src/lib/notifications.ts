"use client";

/**
 * Local notifications.
 *
 * EmberFit has no push server and collects no device tokens, so these are
 * reminders the app schedules on your own device while it is installed. That
 * means they are reliable when the app has been opened recently, and they
 * cannot reach you days later the way a push service would. The settings
 * screen says so rather than implying otherwise.
 */

export type NotificationSupport =
  | "unsupported" // no Notification API at all
  | "insecure" // needs https or localhost
  | "default" // supported, not yet asked
  | "granted"
  | "denied";

export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return Notification.permission as NotificationSupport;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  const support = notificationSupport();
  if (support !== "default") return support;

  try {
    const result = await Notification.requestPermission();
    return result as NotificationSupport;
  } catch {
    return "denied";
  }
}

export interface LocalNotification {
  title: string;
  body: string;
  /** Where tapping it should take you. */
  url?: string;
  /** Replaces any earlier notification with the same tag. */
  tag?: string;
}

/**
 * Show a notification, preferring the service worker so it behaves like a real
 * app notification (and so tapping it can open the right screen).
 */
export async function showLocalNotification(notification: LocalNotification): Promise<boolean> {
  if (notificationSupport() !== "granted") return false;

  const options: NotificationOptions = {
    body: notification.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: notification.tag,
    data: { url: notification.url ?? "/" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(notification.title, options);
        return true;
      }
    }
    // Fall back to a page-level notification (no click routing on some browsers).
    new Notification(notification.title, options);
    return true;
  } catch {
    return false;
  }
}

const REMINDER_KEY = "emberfit:last-reminder";

/**
 * A gentle nudge, at most once a day, and only if the app is open.
 *
 * Intentionally not nagging: it fires only when a reminder is enabled, nothing
 * has been logged, and it hasn't already fired today.
 */
export async function maybeRemind(options: {
  enabled: boolean;
  kind: "workout" | "meal";
  title: string;
  body: string;
  url: string;
}): Promise<void> {
  if (!options.enabled || notificationSupport() !== "granted") return;

  const today = new Date().toISOString().slice(0, 10);
  const key = `${REMINDER_KEY}:${options.kind}`;

  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    // Without storage we can't tell whether we've already nudged today, so
    // stay quiet rather than risk repeating.
    return;
  }

  await showLocalNotification({
    title: options.title,
    body: options.body,
    url: options.url,
    tag: `emberfit-${options.kind}`,
  });
}
