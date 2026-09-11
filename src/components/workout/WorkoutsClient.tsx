"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { apiDelete, apiPost } from "@/lib/client";
import { useStartSession } from "./useStartSession";
import { WORKOUT_STYLE_LABELS, type WorkoutStyle } from "@/lib/types";
import { ExerciseLibrary } from "./ExerciseLibrary";
import type { PlainExercise, PlainWorkout } from "./types";

type Tab = "plans" | "templates" | "exercises";

export function WorkoutsClient({
  workouts,
  exercises,
  activeSessionId,
}: {
  workouts: PlainWorkout[];
  exercises: PlainExercise[];
  activeSessionId: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("plans");
  const [startOpen, setStartOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlainWorkout | null>(null);
  const { start, busyId, dialog: startDialog } = useStartSession();
  const [planningId, setPlanningId] = useState<string | null>(null);

  // ?start=1 opens the picker straight from the nav / quick actions.
  useEffect(() => {
    if (params.get("start") === "1") setStartOpen(true);
  }, [params]);

  const plans = useMemo(() => workouts.filter((w) => !w.isTemplate), [workouts]);
  const templates = useMemo(() => workouts.filter((w) => w.isTemplate), [workouts]);

  const startWorkout = async (workoutId: string | null, workoutName?: string) => {
    const id = await start(workoutId, { workoutName });
    if (id) setStartOpen(false);
  };

  /** Copy a template into a dated workout, so it shows on today's dashboard. */
  const planForToday = async (workout: PlainWorkout) => {
    setPlanningId(workout.id);
    const res = await apiPost<{ id: string }>(`/api/workouts/${workout.id}/instantiate`, {
      scheduledFor: new Date().toISOString(),
    });
    setPlanningId(null);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.success(`"${workout.name}" is planned for today`, "It's on your dashboard now.");
    router.refresh();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setDeletingId(target.id);
    const res = await apiDelete("/api/workouts/" + target.id);
    setDeletingId(null);
    setConfirmDelete(null);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.success(`Deleted "${target.name}"`, "Past sessions of it are still in your history.");
    router.refresh();
  };

  const list = tab === "plans" ? plans : templates;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl font-semibold">Workouts</h1>
          <p className="mt-1 text-sm text-cocoa-600">
            Build a plan, save it as a template, and reuse it whenever you like.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => setStartOpen(true)}>
            Start
          </Button>
          <Link href="/workouts/new">
            <Button>New workout</Button>
          </Link>
        </div>
      </header>

      {activeSessionId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-grad-cocoa px-5 py-4 text-cream">
          <p className="text-sm font-medium">You have a workout in progress.</p>
          <Link href={`/workouts/session/${activeSessionId}`}>
            <Button size="sm" variant="secondary">
              Resume it
            </Button>
          </Link>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-cocoa-100/60 p-1.5">
        {(
          [
            ["plans", `Plans (${plans.length})`],
            ["templates", `Templates (${templates.length})`],
            ["exercises", `Exercises (${exercises.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative shrink-0 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${
              tab === key ? "text-cocoa-900" : "text-cocoa-600 hover:text-cocoa-800"
            }`}
          >
            {tab === key && (
              <motion.span
                layoutId="workout-tab"
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "exercises" ? (
        <ExerciseLibrary exercises={exercises} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === "plans" ? "📋" : "⭐"}
            title={tab === "plans" ? "No workouts yet" : "No templates yet"}
            message={
              tab === "plans"
                ? "Create your first workout, or start one from a suggestion on the dashboard."
                : "Mark any workout as a template and it'll show up here, ready to reuse."
            }
            action={
              <Link href="/workouts/new">
                <Button>Create a workout</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((workout, i) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              delay={i}
              busy={busyId === workout.id}
              planning={planningId === workout.id}
              onStart={() => startWorkout(workout.id, workout.name)}
              onPlanToday={workout.isTemplate ? () => planForToday(workout) : undefined}
              onDelete={() => setConfirmDelete(workout)}
            />
          ))}
        </div>
      )}

      {/* Start picker ------------------------------------------------------ */}
      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Start a workout"
        subtitle="Pick a plan, or go freestyle and add exercises as you go."
      >
        <div className="space-y-2.5 pb-2">
          <button
            onClick={() => startWorkout(null)}
            disabled={busyId === "free"}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-cocoa-300 bg-white/60 p-4 text-left transition hover:border-caramel-400 hover:bg-white disabled:opacity-60"
          >
            <span className="text-xl" aria-hidden>⚡</span>
            <span>
              <span className="block text-sm font-semibold text-cocoa-900">Freestyle session</span>
              <span className="block text-[12px] text-cocoa-500">
                Start an empty session and add exercises as you train
              </span>
            </span>
          </button>

          {workouts.length === 0 ? (
            <EmptyState
              title="No saved workouts"
              message="Create one first, or start freestyle above."
              className="py-6"
            />
          ) : (
            workouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => startWorkout(workout.id, workout.name)}
                disabled={busyId === workout.id}
                className="flex w-full items-center gap-3 rounded-2xl border border-cocoa-200 bg-white/70 p-4 text-left transition hover:border-caramel-300 hover:bg-white disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-cocoa-900">
                    {workout.name}
                    {workout.isTemplate && <span className="ml-2 text-[11px] text-caramel-700">Template</span>}
                  </span>
                  <span className="block truncate text-[12px] text-cocoa-500">
                    {workout.exercises.length} exercises · about {workout.estimatedMinutes} min
                  </span>
                </span>
                <span aria-hidden className="text-cocoa-400">→</span>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Delete confirm ---------------------------------------------------- */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this workout?"
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" fullWidth onClick={remove} loading={deletingId === confirmDelete?.id}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-cocoa-700">
          &ldquo;{confirmDelete?.name}&rdquo; will be removed from your plans. Sessions you already
          completed stay in your history — nothing you&rsquo;ve logged is lost.
        </p>
      </Modal>

      {startDialog}
    </div>
  );
}

function WorkoutCard({
  workout,
  delay,
  busy,
  planning,
  onStart,
  onPlanToday,
  onDelete,
}: {
  workout: PlainWorkout;
  delay: number;
  busy: boolean;
  planning?: boolean;
  onStart: () => void;
  /** Templates only: copy it into a dated workout for today. */
  onPlanToday?: () => void;
  onDelete: () => void;
}) {
  return (
    <Card delay={delay} className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="heading truncate text-lg font-semibold">{workout.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-cocoa-500">
            {WORKOUT_STYLE_LABELS[workout.style as WorkoutStyle] ?? workout.style} ·{" "}
            {workout.exercises.length} exercises · about {workout.estimatedMinutes} min
          </p>
        </div>
        {workout.isTemplate && (
          <span className="chip shrink-0 border-caramel-200 bg-caramel-50 text-caramel-800">
            ⭐ Template
          </span>
        )}
      </div>

      {workout.description && (
        <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-cocoa-600">
          {workout.description}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {workout.exercises.slice(0, 4).map((exercise) => (
          <span key={exercise.id} className="chip">
            {exercise.name}
          </span>
        ))}
        {workout.exercises.length > 4 && (
          <span className="chip border-dashed">+{workout.exercises.length - 4}</span>
        )}
      </div>

      {onPlanToday && (
        <button
          onClick={onPlanToday}
          disabled={planning}
          className="mt-4 w-full rounded-xl border border-dashed border-cocoa-300 px-3 py-2 text-[12.5px] font-semibold text-cocoa-700 transition hover:border-caramel-400 hover:bg-cream disabled:opacity-60"
        >
          {planning ? "Planning…" : "Plan this for today"}
        </button>
      )}

      <div className="mt-auto flex gap-2 pt-3">
        <Button size="sm" onClick={onStart} loading={busy} className="flex-1">
          Start
        </Button>
        <Link href={`/workouts/${workout.id}`} className="flex-1">
          <Button size="sm" variant="secondary" fullWidth>
            Edit
          </Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${workout.name}`}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </Card>
  );
}
