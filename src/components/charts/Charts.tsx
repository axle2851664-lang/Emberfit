"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn, dayKey, addDays, round } from "@/lib/utils";

/**
 * Small, dependency-free SVG charts. Hand-rolled rather than pulled from a
 * charting library so they inherit the warm palette exactly and stay light.
 */

const INK = "#5E402B";
const MUTED = "rgba(94, 64, 43, 0.45)";

/** Activity over the last N weeks, as a GitHub-style heat grid. */
export function ActivityGrid({
  data,
  weeks = 12,
  className,
}: {
  data: Array<{ dayKey: string; count: number }>;
  weeks?: number;
  className?: string;
}) {
  const { columns, maxCount } = useMemo(() => {
    const byDay = new Map(data.map((d) => [d.dayKey, d.count]));
    const today = new Date();
    // Wind back to the most recent Sunday so columns line up as weeks.
    const end = addDays(today, 6 - today.getDay());
    const cells: Array<{ key: string; count: number; future: boolean }> = [];
    const todayKey = dayKey(today);

    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const date = addDays(end, -i);
      const key = dayKey(date);
      cells.push({ key, count: byDay.get(key) ?? 0, future: key > todayKey });
    }

    const cols: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return { columns: cols, maxCount: Math.max(1, ...cells.map((c) => c.count)) };
  }, [data, weeks]);

  const shade = (count: number, future: boolean) => {
    if (future) return "rgba(94, 64, 43, 0.04)";
    if (count === 0) return "rgba(94, 64, 43, 0.08)";
    const intensity = 0.35 + (count / maxCount) * 0.65;
    return `rgba(208, 118, 42, ${intensity})`;
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex min-w-max gap-[3px]">
        {columns.map((column, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {column.map((cell) => (
              <motion.div
                key={cell.key}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: Math.min(ci * 0.012, 0.5) }}
                title={
                  cell.future
                    ? ""
                    : `${cell.key} — ${cell.count} workout${cell.count === 1 ? "" : "s"}`
                }
                className="h-3 w-3 rounded-[3px] sm:h-3.5 sm:w-3.5"
                style={{ background: shade(cell.count, cell.future) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-cocoa-500">
        <span>Less</span>
        {[0, 0.35, 0.6, 0.8, 1].map((v, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-[3px]"
            style={{ background: v === 0 ? "rgba(94,64,43,0.08)" : `rgba(208,118,42,${v})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/** Simple vertical bar chart with a baseline — used for weekly counts. */
export function BarChart({
  data,
  height = 140,
  valueLabel,
  className,
}: {
  data: Array<{ label: string; value: number; caption?: string }>;
  height?: number;
  valueLabel?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-cocoa-500">Nothing to chart yet.</p>;
  }

  return (
    <div className={className}>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((item, i) => {
          const ratio = item.value / max;
          return (
            <div key={`${item.label}-${i}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-semibold tabular-nums text-cocoa-600 opacity-0 transition group-hover:opacity-100">
                {valueLabel ? valueLabel(item.value) : item.value}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(ratio * 100, item.value > 0 ? 6 : 2)}%` }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "w-full rounded-t-lg",
                  item.value > 0 ? "bg-grad-ember" : "bg-cocoa-100",
                )}
                title={`${item.label}: ${valueLabel ? valueLabel(item.value) : item.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((item, i) => (
          <span
            key={`${item.label}-label-${i}`}
            className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-cocoa-500"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Line chart for daily nutrition trends. */
export function LineChart({
  data,
  height = 130,
  className,
  suffix = "",
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
  suffix?: string;
}) {
  const { path, area, points, max } = useMemo(() => {
    if (data.length < 2) return { path: "", area: "", points: [], max: 0 };
    const maxValue = Math.max(1, ...data.map((d) => d.value));
    const w = 100;
    const h = 100;
    const step = w / (data.length - 1);
    const pts = data.map((d, i) => ({
      x: i * step,
      y: h - (d.value / maxValue) * (h - 12) - 6,
      ...d,
    }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    return {
      path: line,
      area: `${line} L${w},${h} L0,${h} Z`,
      points: pts,
      max: maxValue,
    };
  }, [data]);

  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-cocoa-500">Log a couple of days to see a trend.</p>;
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        <defs>
          <linearGradient id="ef-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DE9243" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#DE9243" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          d={area}
          fill="url(#ef-line-fill)"
        />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          d={path}
          fill="none"
          stroke="#D0762A"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="#B25B20" vectorEffect="non-scaling-stroke">
            <title>{`${p.label}: ${round(p.value, 0)}${suffix}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-cocoa-500">
        <span>{data[0].label}</span>
        <span style={{ color: MUTED }}>peak {round(max, 0)}{suffix}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

/** Muscle-group distribution as a horizontal ranked list. */
export function DistributionBars({
  data,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) {
    return <p className="py-6 text-center text-sm text-cocoa-500">No exercises logged yet.</p>;
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-[13px] font-medium text-cocoa-700">{item.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cocoa-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.55, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-grad-ember"
            />
          </div>
          <span className="w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums" style={{ color: INK }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Big number + label, used for the stat rows. */
export function StatTile({
  value,
  label,
  caption,
  accent,
}: {
  value: string | number;
  label: string;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5",
        accent ? "border-transparent bg-grad-ember text-white" : "border-cocoa-200/50 bg-white/70",
      )}
    >
      <p className={cn("text-2xl font-semibold tabular-nums leading-none", accent ? "text-white" : "text-cocoa-900")}>
        {value}
      </p>
      <p className={cn("mt-1.5 text-[12px] font-medium", accent ? "text-white/85" : "text-cocoa-600")}>{label}</p>
      {caption && (
        <p className={cn("mt-0.5 text-[11px]", accent ? "text-white/70" : "text-cocoa-500")}>{caption}</p>
      )}
    </div>
  );
}
