import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DesktopNav, MobileNav } from "@/components/Navigation";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "EmberFit — Workouts & Nutrition",
  description:
    "A warm, calm place to plan workouts, log what you train, and understand what you eat.",
  applicationName: "EmberFit",
  appleWebApp: { capable: true, title: "EmberFit", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FBF7F1",
  width: "device-width",
  initialScale: 1,
  // Let people zoom — never trap them at 1x.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <OfflineBanner />
          <DesktopNav />
          {/* Bottom padding clears the mobile tab bar. */}
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-14 md:pt-8">
            {children}
          </main>
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
