"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  detail?: string;
}

interface ToastApi {
  show: (message: string, options?: { kind?: ToastKind; detail?: string }) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-white text-cocoa-900",
  error: "border-red-200 bg-white text-cocoa-900",
  info: "border-cocoa-200 bg-white text-cocoa-900",
};

const ICONS: Record<ToastKind, string> = { success: "✓", error: "!", info: "i" };

const ICON_STYLES: Record<ToastKind, string> = {
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  info: "bg-cocoa-100 text-cocoa-700",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, options) => {
      const id = Date.now() + Math.random();
      const toast: Toast = { id, kind: options?.kind ?? "info", message, detail: options?.detail };
      setToasts((current) => [...current.slice(-2), toast]);
      // Errors linger a little longer — they usually need reading.
      setTimeout(() => dismiss(id), toast.kind === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, detail) => show(message, { kind: "success", detail }),
      error: (message, detail) => show(message, { kind: "error", detail }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => dismiss(toast.id)}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 shadow-lift ${STYLES[toast.kind]}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ICON_STYLES[toast.kind]}`}
              >
                {ICONS[toast.kind]}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{toast.message}</p>
                {toast.detail && <p className="mt-0.5 text-[13px] leading-snug text-cocoa-600">{toast.detail}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
