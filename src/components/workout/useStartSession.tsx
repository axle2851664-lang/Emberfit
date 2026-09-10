"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/client";

/**
 * Starting a workout, everywhere, with one consistent answer to the awkward
 * case: there's already an unfinished session. Rather than silently swapping
 * workouts (and losing logged sets) we ask.
 */

interface Conflict {
  activeSessionId: string;
  activeSessionName: string;
  loggedSets: number;
  /** What the person was trying to start. */
  workoutId: string | null;
  workoutName?: string;
}

export function useStartSession() {
  const router = useRouter();
  const toast = useToast();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [forcing, setForcing] = useState(false);

  const start = useCallback(
    async (workoutId: string | null, options: { name?: string; workoutName?: string; force?: boolean } = {}) => {
      setBusyId(workoutId ?? "free");
      const res = await apiPost<{ id: string; resumed: boolean }>("/api/sessions", {
        workoutId,
        name: options.name,
        force: options.force ?? false,
      });
      setBusyId(null);

      if (!res.ok) {
        if (res.error.code === "conflict" && res.error.meta) {
          const meta = res.error.meta as unknown as Omit<Conflict, "workoutId" | "workoutName">;
          setConflict({ ...meta, workoutId, workoutName: options.workoutName });
          return null;
        }
        toast.error(res.error.message, res.error.hint);
        return null;
      }

      if (res.data.resumed) toast.show("Picking up where you left off", { kind: "info" });
      router.push(`/workouts/session/${res.data.id}`);
      return res.data.id;
    },
    [router, toast],
  );

  const resumeExisting = useCallback(() => {
    if (!conflict) return;
    const id = conflict.activeSessionId;
    setConflict(null);
    router.push(`/workouts/session/${id}`);
  }, [conflict, router]);

  const discardAndStart = useCallback(async () => {
    if (!conflict) return;
    setForcing(true);
    const target = conflict.workoutId;
    setConflict(null);
    await start(target, { force: true });
    setForcing(false);
  }, [conflict, start]);

  const dialog = (
    <Modal
      open={Boolean(conflict)}
      onClose={() => setConflict(null)}
      title="You have a workout in progress"
      size="sm"
      footer={
        <div className="flex flex-col gap-2.5">
          <Button fullWidth onClick={resumeExisting}>
            Resume &ldquo;{conflict?.activeSessionName}&rdquo;
          </Button>
          <Button variant="danger" fullWidth onClick={discardAndStart} loading={forcing}>
            Discard it and start{conflict?.workoutName ? ` "${conflict.workoutName}"` : " the new one"}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConflict(null)}>
            Cancel
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-cocoa-700">
        &ldquo;{conflict?.activeSessionName}&rdquo; hasn&rsquo;t been finished yet
        {conflict && conflict.loggedSets > 0
          ? ` and has ${conflict.loggedSets} set${conflict.loggedSets === 1 ? "" : "s"} logged.`
          : ", though nothing is logged in it."}{" "}
        Only one workout can be in progress at a time — discarding it will not affect your saved
        plans or anything already in your history.
      </p>
    </Modal>
  );

  return { start, busyId, dialog, hasConflict: Boolean(conflict) };
}
