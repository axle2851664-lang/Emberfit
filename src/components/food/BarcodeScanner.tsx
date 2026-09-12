"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { apiPost } from "@/lib/client";
import { cameraBlocker, decodeFrom, looksLikeBarcode, type ScanBlocker } from "@/lib/barcodeDecoder";
import type { FoodResult, ServiceError } from "@/lib/types";

interface ScanOutcome {
  decoded: { kind: string; gtin: string | null; productHint: string | null; raw: string };
  food: FoodResult | null;
  suggestions: FoodResult[];
  message: string | null;
  hint: string | null;
}

type Phase = "idle" | "scanning" | "looking_up" | "result";

/**
 * Each of these has a different remedy, so they get different words. The
 * insecure-page one matters most in practice: everything else in the app works
 * fine over a plain http:// address on a home network, and only the live
 * camera doesn't — which is baffling unless you say so.
 */
const BLOCKER_MESSAGE: Record<ScanBlocker, string> = {
  none: "",
  insecure:
    "The live camera needs a secure (https) page, and this one isn't. Scanning from a photo and typing the number both still work — or reach the app over https to use the camera.",
  "no-decoder":
    "The barcode decoder couldn't load, so scanning is unavailable right now. Typing the number below works exactly the same way.",
  "no-camera":
    "No camera is available to this browser. Scanning from a photo and typing the number both still work.",
};

/**
 * Live barcode / QR scanning with three escape hatches: upload a photo of the
 * label, type the number, or search by name. Camera permission being denied is
 * a normal path here, not an error state.
 */
export function BarcodeScanner({
  onFound,
  onSearchInstead,
  onManualEntry,
}: {
  onFound: (food: FoodResult) => void;
  onSearchInstead: (hint?: string) => void;
  onManualEntry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<ScanBlocker | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<ServiceError | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    cameraBlocker().then(setBlocker);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const lookup = useCallback(
    async (value: string, format?: string) => {
      stopCamera();
      setPhase("looking_up");
      setError(null);

      const res = await apiPost<ScanOutcome>("/api/foods/barcode", { value, format });
      if (!res.ok) {
        setError(res.error);
        setPhase("result");
        return;
      }
      setOutcome(res.data);
      setPhase("result");

      // A clean hit goes straight through — no extra confirmation tap.
      if (res.data.food) onFound(res.data.food);
    },
    [onFound, stopCamera],
  );

  const startCamera = async () => {
    setCameraError(null);
    setError(null);
    setOutcome(null);
    setPhase("scanning");

    const why = await cameraBlocker();
    if (why !== "none") {
      setBlocker(why);
      setCameraError(BLOCKER_MESSAGE[why]);
      setPhase("idle");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      scanLoop();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera access was denied. You can still scan from a photo, or type the number."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "The camera couldn't be opened.",
      );
      setPhase("idle");
      stopCamera();
    }
  };

  const scanLoop = useCallback(() => {
    const tick = async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;

      if (!busyRef.current && video.readyState >= 2) {
        busyRef.current = true;
        try {
          const hit = await decodeFrom(video);
          if (hit) {
            busyRef.current = false;
            void lookup(hit.value, hit.format);
            return;
          }
        } catch {
          // Keep scanning — a single bad frame means nothing.
        }
        busyRef.current = false;
      }
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
  }, [lookup]);

  const scanFromFile = async (file: File | undefined) => {
    if (!file) return;
    setCameraError(null);
    setPhase("looking_up");

    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const hit = await decodeFrom(img);
      if (!hit) {
        setPhase("idle");
        // Distinguish "nothing in this picture" from "we can't decode at all" —
        // otherwise people retake photos to fix a problem that isn't the photo.
        const why = await cameraBlocker();
        setBlocker(why);
        setCameraError(
          why === "no-decoder"
            ? BLOCKER_MESSAGE["no-decoder"]
            : "No barcode was found in that image. Try a straight-on shot where the bars fill the frame — or type the number below.",
        );
        return;
      }
      await lookup(hit.value, hit.format);
    } catch {
      setPhase("idle");
      setCameraError("That image couldn't be read. Try another, or type the number below.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const submitManual = () => {
    const value = manualCode.trim();
    if (!looksLikeBarcode(value)) {
      setCameraError("A product barcode is 6–14 digits. Check the number under the bars.");
      return;
    }
    void lookup(value.replace(/\D/g, ""), "manual");
  };

  const reset = () => {
    stopCamera();
    setPhase("idle");
    setOutcome(null);
    setError(null);
    setCameraError(null);
  };

  return (
    <div className="space-y-4">
      {/* Viewfinder ------------------------------------------------------- */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cocoa-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${phase === "scanning" ? "opacity-100" : "opacity-0"}`}
        />

        <AnimatePresence>
          {phase === "scanning" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="relative h-40 w-64 max-w-[80%] rounded-2xl border-2 border-cream/70">
                <motion.div
                  className="absolute inset-x-3 h-0.5 bg-ember-400 shadow-[0_0_14px_3px_rgba(244,145,78,0.75)]"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {["-top-px -left-px", "-top-px -right-px", "-bottom-px -left-px", "-bottom-px -right-px"].map(
                  (pos) => (
                    <span
                      key={pos}
                      className={`absolute ${pos} h-5 w-5 rounded-[6px] border-2 border-ember-400`}
                    />
                  ),
                )}
              </div>
              <p className="absolute bottom-5 text-[12.5px] font-medium text-cream/85">
                Hold the barcode inside the frame
              </p>
            </motion.div>
          )}

          {phase !== "scanning" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            >
              {phase === "looking_up" ? (
                <>
                  <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-cream/25 border-t-ember-400" />
                  <p className="mt-4 text-sm font-medium text-cream">Looking that up…</p>
                </>
              ) : (
                <>
                  <span className="text-3xl" aria-hidden>🔎</span>
                  <p className="mt-3 text-sm font-semibold text-cream">Scan a barcode or QR code</p>
                  <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-cream/65">
                    Packaged foods carry a barcode with the product number. QR codes work too if
                    they contain one.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls --------------------------------------------------------- */}
      {phase === "scanning" ? (
        <Button variant="secondary" fullWidth onClick={reset}>
          Stop scanning
        </Button>
      ) : phase !== "looking_up" ? (
        <div className="flex gap-2.5">
          <Button
            className="flex-1"
            onClick={startCamera}
            disabled={Boolean(blocker && blocker !== "none")}
          >
            {blocker && blocker !== "none" ? "Camera unavailable" : "Open camera"}
          </Button>
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => scanFromFile(e.target.files?.[0])}
            />
            <span className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-cocoa-200 bg-white/85 px-4 text-sm font-semibold text-cocoa-800 transition hover:bg-white">
              Scan from photo
            </span>
          </label>
        </div>
      ) : null}

      {blocker && blocker !== "none" && (
        <p className="rounded-xl bg-cocoa-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cocoa-600">
          {BLOCKER_MESSAGE[blocker]}
        </p>
      )}

      {cameraError && (
        <div className="rounded-xl border border-caramel-200 bg-caramel-50/60 px-3.5 py-2.5">
          <p className="text-[12.5px] leading-relaxed text-cocoa-700">{cameraError}</p>
        </div>
      )}

      {/* Manual code ------------------------------------------------------ */}
      <div className="rounded-2xl border border-cocoa-200/60 bg-white/60 p-4">
        <label className="label" htmlFor="manual-code">
          Or type the number under the barcode
        </label>
        <div className="flex gap-2">
          <input
            id="manual-code"
            inputMode="numeric"
            className="field flex-1 tabular-nums"
            placeholder="e.g. 5000112637922"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            maxLength={20}
          />
          <Button variant="secondary" onClick={submitManual} disabled={!manualCode.trim()}>
            Look up
          </Button>
        </div>
      </div>

      {/* Result ----------------------------------------------------------- */}
      {error && (
        <ErrorState message={error.message} hint={error.hint} onRetry={reset} retryLabel="Scan again">
          <Button size="sm" variant="secondary" onClick={() => onSearchInstead()}>
            Search by name
          </Button>
        </ErrorState>
      )}

      {phase === "result" && outcome && !outcome.food && (
        <div className="space-y-3">
          <ErrorState
            title="Nothing matched that code"
            message={outcome.message ?? "That product isn't in the database yet."}
            hint={outcome.hint}
          >
            <Button size="sm" variant="secondary" onClick={reset}>
              Scan again
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSearchInstead(outcome.decoded.productHint ?? "")}
            >
              Search by name
            </Button>
            <Button size="sm" variant="ghost" onClick={onManualEntry}>
              Type the label values
            </Button>
          </ErrorState>

          {outcome.suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-cocoa-700">
                Did you mean one of these?
              </p>
              <ul className="space-y-1.5">
                {outcome.suggestions.map((food, i) => (
                  <li key={`${food.sourceId}-${i}`}>
                    <button
                      onClick={() => onFound(food)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-cocoa-200/60 bg-white/70 px-3.5 py-2.5 text-left transition hover:border-caramel-300 hover:bg-white"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-cocoa-900">
                        {food.name}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-cocoa-500">
                        {Math.round(food.per100.calories)} kcal/100 g
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
