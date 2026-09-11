"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useInstall } from "./useInstall";

/**
 * The floating "add to home screen" nudge.
 *
 * Deliberately gentle: it appears once, only when the browser says installing
 * is actually possible (or on iOS, where it has to be manual), and once you
 * have answered it stays answered. Profile keeps a permanent entry point so
 * dismissing it is never a one-way door.
 */
export function InstallPrompt() {
  const { ready, installed, dismissed, canPrompt, needsIosSteps, promptInstall, remember } =
    useInstall();
  const [visible, setVisible] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => {
    if (!ready || installed || dismissed) return;

    if (canPrompt) {
      setVisible(true);
      return;
    }
    if (needsIosSteps) {
      // Long enough not to interrupt someone who just opened the app.
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [ready, installed, dismissed, canPrompt, needsIosSteps]);

  const act = async () => {
    setVisible(false);
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setIosHelpOpen(true);
  };

  const closeIosHelp = () => {
    setIosHelpOpen(false);
    // They've seen the steps — don't nag again. Profile still has the link.
    remember();
  };

  const notNow = () => {
    setVisible(false);
    remember();
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-sm rounded-2xl border border-cocoa-200 bg-white p-4 shadow-lift sm:inset-x-auto sm:bottom-6 sm:right-6"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grad-ember text-lg text-white"
              >
                🔥
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cocoa-900">Add EmberFit to your phone</p>
                <p className="mt-1 text-[12.5px] leading-snug text-cocoa-600">
                  Opens full screen from your home screen, like a normal app.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={act}>
                    {canPrompt ? "Install" : "Show me how"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={notNow}>
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IosInstallSteps open={iosHelpOpen} onClose={closeIosHelp} />
    </>
  );
}

export function IosInstallSteps({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to your home screen"
      subtitle="Safari has no install button, so it's three taps."
      size="sm"
    >
      <ol className="space-y-3 pb-2">
        {[
          ["Tap the Share button", "The square with an arrow, at the bottom of Safari."],
          ["Choose “Add to Home Screen”", "You may need to scroll the list down a little."],
          ["Tap “Add”", "EmberFit appears on your home screen with its own icon."],
        ].map(([title, detail], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cocoa-800 text-[11px] font-bold text-cream">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-cocoa-900">{title}</span>
              <span className="block text-[12px] leading-snug text-cocoa-600">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="pb-2 text-[11.5px] leading-relaxed text-cocoa-500">
        This has to be done in Safari — Chrome on iOS can&rsquo;t add apps to the home screen.
      </p>
    </Modal>
  );
}
