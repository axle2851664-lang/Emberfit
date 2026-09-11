"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IosInstallSteps } from "./InstallPrompt";
import { useInstall } from "./useInstall";

/**
 * The permanent way to install, so dismissing the floating prompt is never a
 * one-way door. Lives on the Profile page.
 */
export function InstallSection() {
  const { ready, installed, canPrompt, needsIosSteps, promptInstall } = useInstall();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [working, setWorking] = useState(false);

  // Nothing rendered until we know the state, so the copy never flickers.
  if (!ready) return null;

  const install = async () => {
    if (canPrompt) {
      setWorking(true);
      await promptInstall();
      setWorking(false);
      return;
    }
    setStepsOpen(true);
  };

  return (
    <Card>
      <CardHeader
        title="Install on this device"
        subtitle="Runs full screen from your home screen, with its own icon."
      />

      {installed ? (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-3 text-[13px] font-medium text-emerald-800">
          EmberFit is installed on this device.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button onClick={install} loading={working}>
              {canPrompt ? "Install EmberFit" : "How to add it"}
            </Button>
            {!canPrompt && !needsIosSteps && (
              <span className="text-[12px] text-cocoa-500">
                Your browser decides when this is offered — look for an install icon in the
                address bar.
              </span>
            )}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-cocoa-500">
            Installing changes nothing about where your data lives — it still talks to the
            same server on your own machine. It just removes the browser chrome and gives
            you an icon.
          </p>
        </>
      )}

      <IosInstallSteps open={stepsOpen} onClose={() => setStepsOpen(false)} />
    </Card>
  );
}
