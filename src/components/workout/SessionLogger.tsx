"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { apiPatch, apiPost } from "@/lib/client";
import { formatDuration } from "@/lib/utils";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/types";
import { ExercisePicker } from "./WorkoutEditor";
import type { PlainExercise, PlainSession, PlainSessionExercise, PlainSet } from "./types";

/**
 * The live workout screen. Every edit writes straight through to the server so
 * a closed tab or a dead battery never loses a set.
 */
export function SessionLogger({
  session: initialSession,
  exerciseLibrary,
}: {
  session: PlainSession;
  exerciseLibrary: PlainExercise[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [session, setSession] = useState(initialSession);
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [effort, setEffort] = useState<number | null>(null);
  const startedAt = useMemo(() => new Date(session.startedAt).getTime(), [session.startedAt]);

  const readOnly = session.status !== "in_progress";

  // Ticking clock.
  useEffect(() => {
    if (readOnly) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt, readOnly]);

  const totals = useMemo(() => {
    const sets = session.exercises.flatMap((e) => e.sets);
    return {
      done: sets.filter((s) => s.completed).length,
      total: sets.length,
      exercisesDone: session.exercises.filter((e) => e.sets.some((s) => s.completed)).length,
    };
  }, [session]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await apiPost<any>(`/api/sessions/${session.id}/sets`, body);
      if (!res.ok) toast.error(res.error.message, res.error.hint);
      return res;
    },
    [session.id, toast],
  );

  const patchSet = (exerciseId: string, setId: string, patch: Partial<PlainSet>) => {
    // Optimistic: the UI must never lag behind a thumb.
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) },
      ),
    }));
    void post({ action: "update_set", setId, ...patch });
  };

  const addSet = async (exerciseId: string) => {
    const res = await post({ action: "add_set", sessionExerciseId: exerciseId });
    if (!res.ok) return;
    const created = res.data as PlainSet;
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: [...ex.sets, created] } : ex,
      ),
    }));
  };

  const removeSet = async (exerciseId: string, setId: string) => {
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex,
      ),
    }));
    await post({ action: "remove_set", setId });
  };

  const addExercise = async (exercise: PlainExercise) => {
    const res = await post({ action: "add_exercise", exerciseId: exercise.id });
    if (!res.ok) return;
    const created = res.data as PlainSessionExercise & { muscleGroups: string };
    setSession((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: created.id,
          name: created.name,
          muscleGroups: exercise.muscleGroups,
          order: current.exercises.length,
          notes: null,
          completed: false,
          sets: (created.sets ?? []) as PlainSet[],
        },
      ],
    }));
    toast.success(`Added ${exercise.name}`);
  };

  const setExerciseNotes = (exerciseId: string, value: string) => {
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, notes: value } : ex)),
    }));
  };

  const saveExerciseNotes = (exerciseId: string, value: string) => {
    void post({ action: "update_exercise", sessionExerciseId: exerciseId, notes: value || null });
  };

  const finish = async () => {
    if (totals.done === 0) {
      toast.error("No sets logged yet.", "Tick at least one set, or discard the session instead.");
      return;
    }
    setFinishing(true);
    const res = await apiPatch(`/api/sessions/${session.id}`, {
      action: "complete",
      durationSeconds: elapsed,
      notes: notes.trim() || null,
      perceivedEffort: effort,
    });
    setFinishing(false);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }

    setFinishOpen(false);
    setCelebrating(true);
    setTimeout(() => {
      router.push("/history");
      router.refresh();
    }, 1500);
  };

  const abandon = async () => {
    const res = await apiPatch(`/api/sessions/${session.id}`, { action: "abandon" });
    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.show("Session discarded", { kind: "info" });
    router.push("/workouts");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Sticky header ---------------------------------------------------- */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-cocoa-200/50 bg-cream/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="heading truncate text-xl font-semibold sm:text-2xl">{session.name}</h1>
            <p className="mt-0.5 text-[12.5px] text-cocoa-500">
              {readOnly ? (
                "This session is finished."
              ) : (
                <>
                  <span className="tabular-nums font-semibold text-caramel-700">
                    {formatDuration(elapsed)}
                  </span>{" "}
                  · {totals.done}/{totals.total} sets · {totals.exercisesDone}/
                  {session.exercises.length} exercises
                </>
              )}
            </p>
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAbandonOpen(true)}>
                Discard
              </Button>
              <Button size="sm" onClick={() => setFinishOpen(true)}>
                Finish
              </Button>
            </div>
          )}
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cocoa-100">
          <motion.div
            className="h-full rounded-full bg-grad-ember"
            initial={{ width: 0 }}
            animate={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      {/* Exercises -------------------------------------------------------- */}
      {session.exercises.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-3xl" aria-hidden>💪</p>
            <h2 className="heading mt-3 text-lg font-semibold">Empty session</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-cocoa-600">
              Add your first exercise and start logging sets.
            </p>
            <Button className="mt-5" onClick={() => setPickerOpen(true)}>
              Add an exercise
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {session.exercises.map((exercise, index) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              index={index}
              readOnly={readOnly}
              onPatchSet={(setId, patch) => patchSet(exercise.id, setId, patch)}
              onAddSet={() => addSet(exercise.id)}
              onRemoveSet={(setId) => removeSet(exercise.id, setId)}
              onNotesChange={(value) => setExerciseNotes(exercise.id, value)}
              onNotesBlur={(value) => saveExerciseNotes(exercise.id, value)}
            />
          ))}
        </div>
      )}

      {!readOnly && session.exercises.length > 0 && (
        <Button variant="secondary" fullWidth onClick={() => setPickerOpen(true)}>
          + Add another exercise
        </Button>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exerciseLibrary}
        onPick={addExercise}
      />

      {/* Finish ----------------------------------------------------------- */}
      <Modal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish this workout?"
        subtitle={`${formatDuration(elapsed)} · ${totals.done} sets logged`}
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setFinishOpen(false)}>
              Keep going
            </Button>
            <Button fullWidth onClick={finish} loading={finishing}>
              Finish
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pb-2">
          <div>
            <label className="label" htmlFor="s-notes">
              How did it go? <span className="font-normal text-cocoa-400">(optional)</span>
            </label>
            <textarea
              id="s-notes"
              className="field min-h-[80px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering next time"
              maxLength={500}
            />
          </div>

          <div>
            <span className="label">How hard did it feel?</span>
            <div className="flex gap-1.5">
              {[
                [2, "Easy"],
                [5, "Moderate"],
                [7, "Hard"],
                [9, "Very hard"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setEffort(effort === value ? null : (value as number))}
                  className={`pill-toggle flex-1 text-[12.5px] ${
                    effort === value ? "pill-on" : "pill-off"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Discard ---------------------------------------------------------- */}
      <Modal
        open={abandonOpen}
        onClose={() => setAbandonOpen(false)}
        title="Discard this session?"
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setAbandonOpen(false)}>
              Keep going
            </Button>
            <Button variant="danger" fullWidth onClick={abandon}>
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-cocoa-700">
          The sets you logged won&rsquo;t be added to your history. Your saved workout plan stays
          exactly as it is.
        </p>
      </Modal>

      {/* Success animation ------------------------------------------------ */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-cream/95 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-grad-ember text-4xl text-white shadow-lift"
            >
              ✓
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="heading mt-6 text-2xl font-semibold"
            >
              Workout complete
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-1.5 text-sm text-cocoa-600"
            >
              {formatDuration(elapsed)} · {totals.done} sets logged
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseBlock({
  exercise,
  index,
  readOnly,
  onPatchSet,
  onAddSet,
  onRemoveSet,
  onNotesChange,
  onNotesBlur,
}: {
  exercise: PlainSessionExercise;
  index: number;
  readOnly: boolean;
  onPatchSet: (setId: string, patch: Partial<PlainSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onNotesChange: (value: string) => void;
  onNotesBlur: (value: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(Boolean(exercise.notes));
  const done = exercise.sets.filter((s) => s.completed).length;

  return (
    <Card delay={index} className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="heading truncate text-base font-semibold">{exercise.name}</h2>
          <p className="mt-0.5 truncate text-[11.5px] text-cocoa-500">
            {exercise.muscleGroups.map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g).join(" · ")}
          </p>
        </div>
        <span
          className={`chip shrink-0 ${
            done === exercise.sets.length && done > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : ""
          }`}
        >
          {done}/{exercise.sets.length} sets
        </span>
      </div>

      {/* Set rows --------------------------------------------------------- */}
      <div className="mt-4 space-y-1.5">
        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.25rem] gap-2 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-cocoa-400">
          <span>Set</span>
          <span>Reps</span>
          <span>Weight</span>
          <span>Seconds</span>
          <span />
        </div>

        <AnimatePresence initial={false}>
          {exercise.sets.map((set, i) => (
            <motion.div
              key={set.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`grid grid-cols-[2rem_1fr_1fr_1fr_2.25rem] items-center gap-2 rounded-xl px-1 py-1 transition-colors ${
                set.completed ? "bg-emerald-50/70" : ""
              }`}
            >
              <button
                onClick={() => !readOnly && onPatchSet(set.id, { completed: !set.completed })}
                disabled={readOnly}
                aria-label={set.completed ? `Set ${i + 1} done` : `Mark set ${i + 1} done`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold transition ${
                  set.completed
                    ? "bg-emerald-500 text-white"
                    : "bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200"
                } disabled:opacity-60`}
              >
                {set.completed ? "✓" : i + 1}
              </button>

              <SetInput
                value={set.reps}
                placeholder="—"
                disabled={readOnly}
                onCommit={(v) => onPatchSet(set.id, { reps: v })}
              />
              <SetInput
                value={set.weight}
                placeholder="—"
                suffix={set.weightUnit}
                allowDecimal
                disabled={readOnly}
                onCommit={(v) => onPatchSet(set.id, { weight: v })}
              />
              <SetInput
                value={set.seconds}
                placeholder="—"
                disabled={readOnly}
                onCommit={(v) => onPatchSet(set.id, { seconds: v })}
              />

              {!readOnly && exercise.sets.length > 1 ? (
                <button
                  onClick={() => onRemoveSet(set.id)}
                  aria-label={`Remove set ${i + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-cocoa-300 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              ) : (
                <span />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onAddSet}>
            + Set
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? "Hide note" : "Add note"}
          </Button>
        </div>
      )}

      {(showNotes || (readOnly && exercise.notes)) && (
        <input
          className="field mt-2.5 py-2 text-[13px]"
          placeholder="Note for this exercise"
          value={exercise.notes ?? ""}
          disabled={readOnly}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={(e) => onNotesBlur(e.target.value)}
          maxLength={200}
        />
      )}
    </Card>
  );
}

/**
 * A number cell that keeps its own text while focused, so typing "12" doesn't
 * fight with the optimistic value coming back from state.
 */
function SetInput({
  value,
  placeholder,
  suffix,
  disabled,
  allowDecimal,
  onCommit,
}: {
  value: number | null;
  placeholder: string;
  suffix?: string;
  disabled?: boolean;
  allowDecimal?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const shown = draft ?? (value == null ? "" : String(value));

  const commit = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    if (trimmed === "") onCommit(null);
    else {
      const parsed = allowDecimal ? Number.parseFloat(trimmed) : Number.parseInt(trimmed, 10);
      onCommit(Number.isFinite(parsed) && parsed >= 0 ? parsed : null);
    }
    setDraft(null);
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        type="number"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        min={0}
        step={allowDecimal ? "0.5" : "1"}
        disabled={disabled}
        value={shown}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            ref.current?.blur();
          }
        }}
        className="field px-2 py-2 text-center text-[13px] tabular-nums disabled:bg-cream/60"
      />
      {suffix && value != null && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-cocoa-400">
          {suffix}
        </span>
      )}
    </div>
  );
}
