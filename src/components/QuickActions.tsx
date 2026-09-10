"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/** The four things people actually do, one tap from the dashboard. */
const ACTIONS = [
  { href: "/food/add?mode=photo", emoji: "📷", label: "Scan my food", caption: "Photo" },
  { href: "/food/add?mode=barcode", emoji: "🔎", label: "Scan barcode", caption: "Packaged" },
  { href: "/food/add?mode=homemade", emoji: "🍲", label: "Home-cooked", caption: "Ingredients" },
  { href: "/workouts?start=1", emoji: "🏋️", label: "Start workout", caption: "Train" },
];

export function QuickActions({
  hasActiveSession,
  activeSessionId,
}: {
  hasActiveSession?: boolean;
  activeSessionId?: string;
}) {
  return (
    <div className="space-y-3">
      {hasActiveSession && activeSessionId && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-grad-cocoa px-5 py-4 text-cream shadow-soft"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember-400" />
            </span>
            <p className="text-sm font-medium">A workout is in progress.</p>
          </div>
          <Link
            href={`/workouts/session/${activeSessionId}`}
            className="rounded-xl bg-cream px-4 py-2 text-sm font-semibold text-cocoa-900 transition hover:bg-white"
          >
            Resume
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACTIONS.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={action.href}
              className="group flex h-full flex-col gap-1.5 rounded-2xl border border-cocoa-200/60 bg-white/75 p-4 transition-all hover:-translate-y-0.5 hover:border-caramel-300 hover:shadow-lift active:scale-[0.98]"
            >
              <span className="text-xl" aria-hidden>
                {action.emoji}
              </span>
              <span className="text-[13.5px] font-semibold leading-tight text-cocoa-900">
                {action.label}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-cocoa-500">
                {action.caption}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
