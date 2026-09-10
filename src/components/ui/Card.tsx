"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: _as,
  delay = 0,
  interactive,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  /** Stagger index for the entrance animation. */
  delay?: number;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: Math.min(delay, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        "card p-5",
        interactive &&
          "cursor-pointer transition-shadow duration-200 hover:shadow-lift active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="heading text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] leading-snug text-cocoa-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="heading min-w-0 truncate text-[19px] font-semibold">{children}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
