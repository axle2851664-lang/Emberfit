"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { EstimateBadge } from "@/components/ui/Nutrition";
import { apiPost } from "@/lib/client";
import type { PhotoAnalysis, PhotoCandidate, ServiceError } from "@/lib/types";
import { confidenceLabel } from "@/lib/types";

/**
 * Photo → likely foods.
 *
 * The photo is resized in the browser, sent to our own endpoint, and never
 * stored. What comes back is explicitly a set of *candidates* the user confirms
 * or corrects — the UI never claims the model knows the portion.
 */

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.82;

async function downscale(file: File): Promise<{ dataUrl: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Some formats (HEIC on older browsers) can't be decoded; send as-is.
    const raw = await fileToDataUrl(file);
    return { dataUrl: raw, previewUrl: raw };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const raw = await fileToDataUrl(file);
    return { dataUrl: raw, previewUrl: raw };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataUrl, previewUrl: dataUrl };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export function PhotoScanner({
  onConfirm,
  onManualEntry,
}: {
  onConfirm: (candidates: PhotoCandidate[], mealName: string | null) => void;
  onManualEntry: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<ServiceError | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAnalysis(null);

    if (!file.type.startsWith("image/")) {
      setError({ code: "invalid_input", message: "That isn't an image file.", hint: "Pick a photo instead." });
      return;
    }

    let prepared: { dataUrl: string; previewUrl: string };
    try {
      prepared = await downscale(file);
    } catch {
      setError({
        code: "invalid_input",
        message: "That photo couldn't be read.",
        hint: "Try a different one, or enter the ingredients yourself.",
      });
      return;
    }

    setPreview(prepared.previewUrl);
    setLastDataUrl(prepared.dataUrl);
    await analyze(prepared.dataUrl);
  };

  const analyze = async (dataUrl: string) => {
    setAnalyzing(true);
    const res = await apiPost<PhotoAnalysis>("/api/vision/analyze", { image: dataUrl }, 60_000);
    setAnalyzing(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setAnalysis(res.data);
    // Pre-select everything the model was reasonably sure about.
    setSelected(
      new Set(
        res.data.candidates
          .map((c, i) => (c.confidence >= 0.45 ? i : -1))
          .filter((i) => i >= 0),
      ),
    );
  };

  const reset = () => {
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setSelected(new Set());
    setLastDataUrl(null);
  };

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  const confirm = () => {
    if (!analysis) return;
    const picked = analysis.candidates.filter((_, i) => selected.has(i));
    onConfirm(picked, analysis.mealNameGuess ?? null);
  };

  // --- Idle: pick a photo ---------------------------------------------------
  if (!preview) {
    return (
      <div className="space-y-4">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <button
          onClick={() => cameraRef.current?.click()}
          className="group relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-cocoa-300 bg-white/50 px-6 py-12 transition hover:border-caramel-400 hover:bg-white/80"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-grad-ember text-2xl text-white shadow-soft transition group-hover:scale-105">
            📷
          </span>
          <span className="text-base font-semibold text-cocoa-900">Take a photo</span>
          <span className="max-w-xs text-center text-[12.5px] leading-relaxed text-cocoa-500">
            Get the whole plate in frame with good light. We&rsquo;ll suggest what&rsquo;s in it —
            you confirm the portions.
          </span>
        </button>

        <Button variant="secondary" fullWidth onClick={() => fileRef.current?.click()}>
          Choose from library
        </Button>

        <div className="rounded-2xl bg-cocoa-50 p-4">
          <p className="text-[12.5px] font-semibold text-cocoa-800">How this works</p>
          <p className="mt-1 text-[12px] leading-relaxed text-cocoa-600">
            The photo is analysed on the server and is not saved. Recognition names the likely
            foods; the nutrition comes from the food database, scaled to the portion you confirm.
            Everything is an estimate until you check it.
          </p>
        </div>

        <button
          onClick={onManualEntry}
          className="w-full text-center text-[13px] font-semibold text-caramel-700 hover:text-caramel-800"
        >
          Skip the photo — enter it manually
        </button>
      </div>
    );
  }

  // --- Analysing / results --------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="The food you photographed" className="max-h-72 w-full object-cover" />

        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-cocoa-950/55 backdrop-blur-[2px]"
            >
              <div className="relative h-24 w-40 overflow-hidden rounded-xl border-2 border-cream/60">
                <motion.div
                  className="absolute inset-x-0 h-0.5 bg-ember-400 shadow-[0_0_12px_2px_rgba(244,145,78,0.8)]"
                  animate={{ top: ["8%", "92%", "8%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-4 text-sm font-semibold text-cream">Looking at your plate…</p>
              <p className="mt-1 text-[12px] text-cream/70">This usually takes a few seconds</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <ErrorState
          title="Couldn't analyse that photo"
          message={error.message}
          hint={error.hint}
          onRetry={lastDataUrl ? () => analyze(lastDataUrl) : undefined}
        >
          <Button size="sm" variant="secondary" onClick={onManualEntry}>
            Enter it manually
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Try another photo
          </Button>
        </ErrorState>
      )}

      {analysis && !analyzing && (
        <>
          {analysis.candidates.length === 0 ? (
            <ErrorState
              title="Nothing recognised"
              message={analysis.message ?? "No food was found in that photo."}
              hint="A closer, brighter shot usually helps — or just add the ingredients yourself."
            >
              <Button size="sm" variant="secondary" onClick={onManualEntry}>
                Enter manually
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                Try another photo
              </Button>
            </ErrorState>
          ) : (
            <>
              <div className="rounded-2xl border border-caramel-200 bg-caramel-50/60 px-4 py-3">
                <p className="text-[12.5px] font-semibold text-caramel-900">
                  These are estimates — please review them
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-cocoa-600">
                  Recognition can be wrong about both the food and the portion. Untick anything
                  that isn&rsquo;t there, and you can fix names and amounts on the next step.
                </p>
              </div>

              {analysis.message && (
                <p className="text-[12.5px] text-cocoa-600">{analysis.message}</p>
              )}

              <ul className="space-y-2">
                {analysis.candidates.map((candidate, i) => {
                  const on = selected.has(i);
                  return (
                    <li key={`${candidate.name}-${i}`}>
                      <button
                        onClick={() => toggle(i)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                          on
                            ? "border-caramel-300 bg-white shadow-soft"
                            : "border-cocoa-200/60 bg-white/50 opacity-70"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold transition ${
                            on
                              ? "border-caramel-500 bg-caramel-500 text-white"
                              : "border-cocoa-300 bg-transparent text-transparent"
                          }`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-cocoa-900">
                              {candidate.name}
                            </span>
                            <EstimateBadge
                              confidence={candidate.confidence}
                              label={confidenceLabel(candidate.confidence)}
                            />
                          </span>
                          <span className="mt-0.5 block text-[12px] text-cocoa-500">
                            about {candidate.estimatedGrams} g
                            {candidate.preparation ? ` · ${candidate.preparation}` : ""}
                            {candidate.matchedFoodName
                              ? ` · matched to "${candidate.matchedFoodName}"`
                              : " · no nutrition match yet"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex gap-2.5">
                <Button variant="secondary" onClick={reset} className="flex-1">
                  Retake
                </Button>
                <Button onClick={confirm} disabled={selected.size === 0} className="flex-1">
                  Continue ({selected.size})
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
