"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/** Empty, error and loading states — used everywhere so nothing dead-ends. */

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cocoa-100 text-2xl text-cocoa-600">
          {icon}
        </div>
      )}
      <h3 className="heading text-base font-semibold">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-cocoa-600">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "That didn't work",
  message,
  hint,
  onRetry,
  retryLabel = "Try again",
  children,
}: {
  title?: string;
  message: string;
  hint?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-caramel-200 bg-caramel-50/70 p-5">
      <div className="flex gap-3">
        <span aria-hidden className="mt-0.5 text-lg">⚠️</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-caramel-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-cocoa-700">{message}</p>
          {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-cocoa-600">{hint}</p>}
          {(onRetry || children) && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {onRetry && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  {retryLabel}
                </Button>
              )}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl bg-cocoa-100/70", className)} />;
}

export function LoadingCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5">
      <Skeleton className="mb-4 h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("mb-2.5 h-4", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-cocoa-200 border-t-caramel-500" />
      {label && <p className="text-sm text-cocoa-600">{label}</p>}
    </div>
  );
}
