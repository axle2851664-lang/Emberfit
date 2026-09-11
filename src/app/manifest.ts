import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * Kept as a route rather than a static file so the palette and copy stay in one
 * place with the rest of the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EmberFit — Workouts & Nutrition",
    short_name: "EmberFit",
    description:
      "Plan and log workouts, and understand what you eat — from a photo, a barcode, or the ingredients of something you cooked.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2E2016",
    theme_color: "#FBF7F1",
    categories: ["health", "fitness", "lifestyle"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable icons let Android crop to its own shape without a white box.
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the installed icon to jump straight to a task.
    shortcuts: [
      {
        name: "Start a workout",
        short_name: "Workout",
        description: "Pick a plan or train freestyle",
        url: "/workouts?start=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Scan my food",
        short_name: "Scan food",
        description: "Photograph a meal to log it",
        url: "/food/add?mode=photo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Scan a barcode",
        short_name: "Barcode",
        description: "Log a packaged food",
        url: "/food/add?mode=barcode",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
