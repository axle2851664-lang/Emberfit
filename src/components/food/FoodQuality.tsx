"use client";

import { NOVA_LABELS, NUTRI_SCORE_LABELS, hasQuality, type FoodQuality } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Published quality signals for a packaged product.
 *
 * Every figure here is somebody else's established measure, shown as
 * published: Nutri-Score is the official EU front-of-pack label, NOVA is the
 * standard processing classification, and the additives are simply what the
 * label lists. Deliberately no blended "EmberFit score" — one invented number
 * would read as far more authoritative than the inputs justify, and it would
 * be impossible to argue with.
 */

const NUTRI_COLORS: Record<string, string> = {
  a: "bg-emerald-600 text-white",
  b: "bg-lime-600 text-white",
  c: "bg-amber-500 text-white",
  d: "bg-orange-600 text-white",
  e: "bg-red-600 text-white",
};

const NOVA_TONE: Record<number, string> = {
  1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  2: "border-lime-200 bg-lime-50 text-lime-800",
  3: "border-amber-200 bg-amber-50 text-amber-800",
  4: "border-orange-200 bg-orange-50 text-orange-800",
};

export function NutriScoreBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" }) {
  const g = grade.toLowerCase();
  return (
    <span
      title={`Nutri-Score ${g.toUpperCase()} — ${NUTRI_SCORE_LABELS[g] ?? ""}`}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold uppercase leading-none",
        NUTRI_COLORS[g] ?? "bg-cocoa-300 text-white",
        size === "sm" ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm",
      )}
    >
      {g}
    </span>
  );
}

/** Compact form for list rows — just the grade and a processing hint. */
export function QualityChips({ quality }: { quality: FoodQuality | null | undefined }) {
  if (!hasQuality(quality)) return null;
  const q = quality!;

  return (
    <span className="inline-flex items-center gap-1.5">
      {q.nutriScore && <NutriScoreBadge grade={q.nutriScore} size="sm" />}
      {q.novaGroup === 4 && (
        <span className="rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
          Ultra-processed
        </span>
      )}
      {q.isOrganic && (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
          Organic
        </span>
      )}
    </span>
  );
}

/** The full panel, shown once a product has been identified. */
export function FoodQualityPanel({
  quality,
  className,
}: {
  quality: FoodQuality | null | undefined;
  className?: string;
}) {
  if (!hasQuality(quality)) return null;
  const q = quality!;
  const additives = q.additives ?? [];

  return (
    <div className={cn("rounded-2xl border border-cocoa-200/60 bg-white/70 p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-cocoa-900">Product quality</h3>
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-cocoa-400">
          Open Food Facts
        </span>
      </div>

      <div className="space-y-2.5">
        {q.nutriScore && (
          <div className="flex items-center gap-3">
            <NutriScoreBadge grade={q.nutriScore} />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-cocoa-800">
                Nutri-Score {q.nutriScore.toUpperCase()}
              </span>
              <span className="block text-[11.5px] leading-snug text-cocoa-500">
                {NUTRI_SCORE_LABELS[q.nutriScore.toLowerCase()]}
              </span>
            </span>
          </div>
        )}

        {q.novaGroup && (
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                NOVA_TONE[q.novaGroup] ?? "border-cocoa-200 bg-cocoa-50 text-cocoa-700",
              )}
            >
              {q.novaGroup}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-cocoa-800">
                NOVA group {q.novaGroup}
              </span>
              <span className="block text-[11.5px] leading-snug text-cocoa-500">
                {NOVA_LABELS[q.novaGroup]}
              </span>
            </span>
          </div>
        )}

        {q.isOrganic && (
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-sm">
              🌱
            </span>
            <span className="text-[12.5px] font-semibold text-cocoa-800">
              Certified organic
            </span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cocoa-200 bg-cocoa-50 text-[12px] font-bold text-cocoa-700">
            {additives.length}
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-cocoa-800">
              {additives.length === 0
                ? "No additives listed"
                : `${additives.length} additive${additives.length === 1 ? "" : "s"} on the label`}
            </span>
            {additives.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {additives.map((additive) => (
                  <span
                    key={additive}
                    className="rounded-md bg-cocoa-100 px-1.5 py-0.5 text-[10.5px] font-medium text-cocoa-700"
                  >
                    {additive}
                  </span>
                ))}
              </span>
            )}
          </span>
        </div>
      </div>

      <p className="mt-3.5 border-t border-cocoa-200/60 pt-3 text-[11px] leading-relaxed text-cocoa-500">
        These are published measures shown as they stand — Nutri-Score is the official EU
        nutrition label, NOVA the standard processing classification, and the additives are
        what the packaging lists. EmberFit doesn&rsquo;t rate them or combine them into a
        score of its own.
      </p>
    </div>
  );
}
