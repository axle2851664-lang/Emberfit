"use client";

import { motion } from "framer-motion";
import type { Nutrients } from "@/lib/types";
import { cn, round } from "@/lib/utils";

/** The macro colours, used consistently everywhere nutrition appears. */
export const MACRO_COLORS = {
  protein: "#8E441D",
  carbs: "#DE9243",
  fat: "#B08A63",
  fiber: "#7A5537",
} as const;

export function NutrientPill({
  label,
  value,
  unit = "g",
  color,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl bg-cream/80 px-1.5 py-2.5 sm:px-2">
      <span className="text-[15px] font-semibold tabular-nums text-cocoa-900">
        {value == null ? "—" : round(value, value < 10 ? 1 : 0)}
        <span className="ml-0.5 text-[11px] font-medium text-cocoa-500">{unit}</span>
      </span>
      <span className="mt-0.5 flex max-w-full items-center gap-1 truncate text-[10.5px] font-medium uppercase tracking-wide text-cocoa-500 sm:text-[11px]">
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </span>
    </div>
  );
}

/** Compact macro readout used on meal cards and day totals. */
export function NutritionSummary({
  nutrients,
  showExtended = false,
  className,
}: {
  nutrients: Nutrients;
  showExtended?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", showExtended ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-4", className)}>
      <NutrientPill label="kcal" value={nutrients.calories} unit="" />
      <NutrientPill label="Protein" value={nutrients.protein} color={MACRO_COLORS.protein} />
      <NutrientPill label="Carbs" value={nutrients.carbs} color={MACRO_COLORS.carbs} />
      <NutrientPill label="Fat" value={nutrients.fat} color={MACRO_COLORS.fat} />
      {showExtended && (
        <>
          <NutrientPill label="Fibre" value={nutrients.fiber} color={MACRO_COLORS.fiber} />
          <NutrientPill label="Sugar" value={nutrients.sugar} />
          <NutrientPill label="Sodium" value={nutrients.sodium} unit="mg" />
        </>
      )}
    </div>
  );
}

/** Horizontal macro-split bar. Proportions only — no targets, no judgement. */
export function MacroBar({
  split,
  className,
}: {
  split: { protein: number; carbs: number; fat: number };
  className?: string;
}) {
  const total = split.protein + split.carbs + split.fat;
  if (total <= 0) {
    return <div className={cn("h-2.5 w-full rounded-full bg-cocoa-100", className)} />;
  }

  const segments = [
    { key: "protein", value: split.protein, color: MACRO_COLORS.protein, label: "Protein" },
    { key: "carbs", value: split.carbs, color: MACRO_COLORS.carbs, label: "Carbs" },
    { key: "fat", value: split.fat, color: MACRO_COLORS.fat, label: "Fat" },
  ];

  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-cocoa-100">
        {segments.map((segment) => (
          <motion.div
            key={segment.key}
            initial={{ width: 0 }}
            animate={{ width: `${(segment.value / total) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: segment.color }}
            title={`${segment.label} ${segment.value}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <span key={segment.key} className="flex items-center gap-1.5 text-[11px] font-medium text-cocoa-600">
            <span className="h-2 w-2 rounded-full" style={{ background: segment.color }} />
            {segment.label} {segment.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Estimate" badge with an optional confidence word. Never claims precision. */
export function EstimateBadge({
  confidence,
  label,
  className,
}: {
  confidence?: number | null;
  label?: string;
  className?: string;
}) {
  const tone =
    confidence == null
      ? "border-cocoa-200 bg-cocoa-50 text-cocoa-700"
      : confidence >= 0.75
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : confidence >= 0.5
          ? "border-caramel-200 bg-caramel-50 text-caramel-800"
          : "border-cocoa-200 bg-cocoa-50 text-cocoa-600";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone,
        className,
      )}
    >
      <span aria-hidden>≈</span>
      {label ?? "Estimate"}
    </span>
  );
}
