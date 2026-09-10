"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BottomSheet } from "./ui/Modal";
import { cn } from "@/lib/utils";

/**
 * Two navigations from one source of truth: a top bar on desktop, a bottom bar
 * with a centre "Add" affordance on mobile.
 */

const LINKS = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: HomeIcon },
  { href: "/workouts", label: "Workouts", mobileLabel: "Workouts", icon: DumbbellIcon },
  { href: "/food", label: "Food", mobileLabel: "Food", icon: BowlIcon },
  { href: "/history", label: "History", mobileLabel: "History", icon: ChartIcon },
  { href: "/profile", label: "Profile", mobileLabel: "Profile", icon: PersonIcon },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-cocoa-200/50 bg-cream/80 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Flame />
          <span className="heading text-[19px] font-semibold tracking-tight">EmberFit</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-cocoa-900" : "text-cocoa-600 hover:text-cocoa-900",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="desktop-nav-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-soft"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/food/add"
            className="rounded-xl border border-cocoa-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-cocoa-800 transition hover:border-cocoa-300 hover:bg-white"
          >
            Log food
          </Link>
          <Link
            href="/workouts?start=1"
            className="rounded-xl bg-grad-ember px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition hover:shadow-lift"
          >
            Start workout
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const go = (href: string) => {
    setSheetOpen(false);
    router.push(href);
  };

  const left = LINKS.slice(0, 2);
  const right = LINKS.slice(2, 4);

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-cocoa-200/60 bg-cream/92 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {left.map((link) => (
            <NavTab key={link.href} {...link} active={isActive(pathname, link.href)} />
          ))}

          <div className="flex w-16 shrink-0 items-center justify-center">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Quick add"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-grad-ember text-white shadow-lift transition active:scale-95"
            >
              <motion.span animate={{ rotate: sheetOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </motion.span>
            </button>
          </div>

          {right.map((link) => (
            <NavTab key={link.href} {...link} active={isActive(pathname, link.href)} />
          ))}
        </div>
      </nav>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="What are you adding?">
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            emoji="🏋️"
            title="Start workout"
            caption="Pick a plan or go freestyle"
            onClick={() => go("/workouts?start=1")}
          />
          <QuickAction
            emoji="📷"
            title="Scan my food"
            caption="Photo → likely ingredients"
            onClick={() => go("/food/add?mode=photo")}
          />
          <QuickAction
            emoji="🔎"
            title="Scan barcode"
            caption="Packaged food or QR"
            onClick={() => go("/food/add?mode=barcode")}
          />
          <QuickAction
            emoji="🍲"
            title="Home-cooked"
            caption="Estimate from ingredients"
            onClick={() => go("/food/add?mode=homemade")}
          />
        </div>
        <button
          onClick={() => go("/food/add?mode=search")}
          className="mt-3 w-full rounded-2xl border border-cocoa-200 bg-white/70 px-4 py-3 text-sm font-semibold text-cocoa-800 transition hover:bg-white"
        >
          Search the food database
        </button>
      </BottomSheet>
    </>
  );
}

function NavTab({
  href,
  mobileLabel,
  icon: Icon,
  active,
}: {
  href: string;
  mobileLabel: string;
  icon: (props: { active: boolean }) => React.ReactElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
        active ? "text-caramel-700" : "text-cocoa-500",
      )}
    >
      <Icon active={active} />
      <span>{mobileLabel}</span>
    </Link>
  );
}

function QuickAction({
  emoji,
  title,
  caption,
  onClick,
}: {
  emoji: string;
  title: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-2xl border border-cocoa-200 bg-white/80 p-4 text-left transition active:scale-[0.97] hover:border-caramel-300 hover:bg-white"
    >
      <span className="text-xl" aria-hidden>{emoji}</span>
      <span className="text-sm font-semibold text-cocoa-900">{title}</span>
      <span className="text-[11.5px] leading-snug text-cocoa-500">{caption}</span>
    </button>
  );
}

// --- Icons (inline so there's no icon-font dependency) ---------------------

function Flame() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-grad-ember text-white shadow-soft">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.8 8.6 9 9.6 10 10c0-2.5.8-5.5 2-8z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

const stroke = (active: boolean) => ({
  stroke: "currentColor",
  strokeWidth: active ? 2.1 : 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" {...stroke(active)} />
      <path d="M9.5 21v-6h5v6" {...stroke(active)} />
    </svg>
  );
}

function DumbbellIcon({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" {...stroke(active)} />
    </svg>
  );
}

function BowlIcon({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 11h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9z" {...stroke(active)} />
      <path d="M9 7.5c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5" {...stroke(active)} />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 20V10M10 20V5M16 20v-7M22 20H2" {...stroke(active)} />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="3.5" {...stroke(active)} />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...stroke(active)} />
    </svg>
  );
}
