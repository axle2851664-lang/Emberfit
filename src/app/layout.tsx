import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DesktopNav, MobileNav } from "@/components/Navigation";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AppleSplashLinks } from "@/components/pwa/AppleSplashLinks";

export const metadata: Metadata = {
  title: "EmberFit — Workouts & Nutrition",
  description:
    "A warm, calm place to plan workouts, log what you train, and understand what you eat.",
  applicationName: "EmberFit",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EmberFit",
    // "default" keeps the status bar legible against the cream background.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Installed apps shouldn't have phone numbers auto-linked in workout notes.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Matches the app background in light mode, and the chrome in dark mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#2E2016" },
  ],
  width: "device-width",
  initialScale: 1,
  // Let people zoom — never trap them at 1x.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <AppleSplashLinks />
      </head>
      <body className="min-h-screen">
        <ToastProvider>
          <OfflineBanner />
          <DesktopNav />
          {/* Bottom padding clears the mobile tab bar. */}
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-14 md:pt-8">
            {children}
          </main>
          <MobileNav />
          <ServiceWorkerRegistrar />
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
