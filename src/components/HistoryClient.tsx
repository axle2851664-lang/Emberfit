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
import { NutritionSummary } from "@/components/ui/Nutrition";
import { ActivityGrid, BarChart, DistributionBars, LineChart, StatTile } from "@/components/charts/Charts";
import { apiDelete } from "@/lib/client";
import { addDays, dayKey, formatDayLabel, formatDuration } from "@/lib/utils";
import { MUSCLE_GROUP_LABELS, WORKOUT_STYLE_LABELS, type MuscleGroup, type Nutrients, type WorkoutStyle } from "@/lib/types";
import type { TrainingStats } from "@/lib/services/workoutService";

interface HistorySet {
  id: string;
  reps: number | null;
  seconds: number | null;
  weight: number | null;
  weightUnit: string;
  completed: boolean;
}

interface HistoryExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  completed: boolean;
  notes: string | null;
  sets: HistorySet[];
}

interface HistorySession {
  id: string;
  name: string;
  style: string;
  completedAt: string;
  durationSeconds: number | null;
  notes: string | null;
  perceivedEffort: number | null;
  exercises: HistoryExercise[];
}

type Tab = "workouts" | "nutrition";

export function HistoryClient({
  sessions,
  stats,
  nutritionDays,
}: {
  sessions: HistorySession[];
  stats: TrainingStats;
  nutritionDays: Array<{ dayKey: string; totals: Nutrients; count: number }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>(params.get("tab") === "nutrition" ? "nutrition" : "workouts");
  const [confirmDelete, setConfirmDelete] = useState<HistorySession | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.get("tab") === "nutrition") setTab("nutrition");
  }, [params]);

  const weekly = useMemo(() => {
    // Last 8 weeks, Monday-anchored.
    const buckets: Array<{ label: string; value: number }> = [];
    const byDay = new Map(stats.byDay.map((d) => [d.dayKey, d.count]));
    for (let w = 7; w >= 0; w--) {
      const end = addDays(new Date(), -w * 7);
      let count = 0;
      for (let d = 0; d < 7; d++) count += byDay.get(dayKey(addDays(end, -d))) ?? 0;
      buckets.push({ label: w === 0 ? "This wk" : `−${w}w`, value: count });
    }
    return buckets;
  }, [stats.byDay]);

  const distribution = useMemo(
    () =>
      Object.entries(stats.muscleGroupCounts)
        .map(([group, value]) => ({
          label: MUSCLE_GROUP_LABELS[group as MuscleGroup] ?? group,
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [stats.muscleGroupCounts],
  );

  const nutritionSeries = useMemo(
    () =>
      [...nutritionDays]
        .reverse()
        .slice(-14)
        .map((day) => ({
          label: formatDayLabel(day.dayKey).replace("Today", "Now").slice(0, 6),
          value: day.totals.calories,
        })),
    [nutritionDays],
  );

  const proteinSeries = useMemo(
    () =>
      [...nutritionDays]
        .reverse()
        .slice(-14)
        .map((day) => ({
          label: formatDayLabel(day.dayKey).slice(0, 6),
          value: day.totals.protein,
        })),
    [nutritionDays],
  );

  const removeSession = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await apiDelete(`/api/sessions/${confirmDelete.id}`);
    setDeleting(false);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.success("Session deleted");
    setConfirmDelete(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading text-3xl font-semibold">History</h1>
        <p className="mt-1 text-sm text-cocoa-600">
          Everything you&rsquo;ve logged, and a few plain views of it.
        </p>
      </header>

      <div className="flex gap-1.5 rounded-2xl bg-cocoa-100/60 p-1.5">
        {(
          [
            ["workouts", "Workouts"],
            ["nutrition", "Nutrition"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${
              tab === key ? "text-cocoa-900" : "text-cocoa-600 hover:text-cocoa-800"
            }`}
          >
            {tab === key && (
              <motion.span
                layoutId="history-tab"
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "workouts" ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile value={stats.totalSessions} label="Total sessions" accent />
            <StatTile value={stats.last7} label="Last 7 days" />
            <StatTile value={stats.last30} label="Last 30 days" />
            <StatTile
              value={stats.currentStreakDays}
              label="Day streak"
              caption={stats.currentStreakDays === 0 ? "start one today" : "keep it going"}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <SectionTitle>Consistency</SectionTitle>
              <p className="-mt-2 mb-4 text-[12.5px] text-cocoa-500">
                Each square is a day over the last 12 weeks.
              </p>
              <ActivityGrid data={stats.byDay} weeks={12} />
            </Card>

            <Card>
              <SectionTitle>Sessions per week</SectionTitle>
              <p className="-mt-2 mb-4 text-[12.5px] text-cocoa-500">The last eight weeks.</p>
              <BarChart data={weekly} />
            </Card>
          </div>

          <Card>
            <SectionTitle>What you&rsquo;ve been training</SectionTitle>
            <p className="-mt-2 mb-4 text-[12.5px] text-cocoa-500">
              How often each muscle group has appeared in a logged session.
            </p>
            <DistributionBars data={distribution} />
          </Card>

          <section>
            <SectionTitle>All sessions</SectionTitle>
            {sessions.length === 0 ? (
              <Card>
                <EmptyState
                  icon="📓"
                  title="No sessions logged yet"
                  message="Finish a workout and it'll appear here with every set you recorded."
                  action={
                    <Link href="/workouts">
                      <Button>Go to workouts</Button>
                    </Link>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, i) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    delay={i % 8}
                    onDelete={() => setConfirmDelete(session)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {nutritionDays.length === 0 ? (
            <Card>
              <EmptyState
                icon="🍽️"
                title="No meals logged yet"
                message="Once you've logged a few days, your nutrition history shows up here."
                action={
                  <Link href="/food/add">
                    <Button>Add a meal</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <SectionTitle>Energy logged per day</SectionTitle>
                  <p className="-mt-2 mb-4 text-[12.5px] text-cocoa-500">
                    What you recorded — not a target to hit.
                  </p>
                  <LineChart data={nutritionSeries} suffix=" kcal" />
                </Card>

                <Card>
                  <SectionTitle>Protein per day</SectionTitle>
                  <p className="-mt-2 mb-4 text-[12.5px] text-cocoa-500">Grams recorded per day.</p>
                  <LineChart data={proteinSeries} suffix=" g" />
                </Card>
              </div>

              <section>
                <SectionTitle>Day by day</SectionTitle>
                <div className="space-y-3">
                  {nutritionDays.map((day, i) => (
                    <Card key={day.dayKey} delay={i % 8} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="heading text-base font-semibold">
                            {formatDayLabel(day.dayKey)}
                          </h3>
                          <p className="text-[11.5px] text-cocoa-500">
                            {day.count} {day.count === 1 ? "entry" : "entries"}
                          </p>
                        </div>
                        <Link
                          href={`/food?day=${day.dayKey}`}
                          className="text-[12.5px] font-semibold text-caramel-700 hover:text-caramel-800"
                        >
                          Open →
                        </Link>
                      </div>
                      <NutritionSummary nutrients={day.totals} showExtended />
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this session?"
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" fullWidth onClick={removeSession} loading={deleting}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-cocoa-700">
          &ldquo;{confirmDelete?.name}&rdquo; and every set you logged in it will be permanently
          removed from your history.
        </p>
      </Modal>
    </div>
  );
}

function SessionCard({
  session,
  delay,
  onDelete,
}: {
  session: HistorySession;
  delay: number;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <Card delay={delay} className="p-4">
      <div id={`session-${session.id}`} className="scroll-mt-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="heading truncate text-base font-semibold">{session.name}</h3>
            <p className="mt-0.5 text-[11.5px] text-cocoa-500">
              {new Date(session.completedAt).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              · {WORKOUT_STYLE_LABELS[session.style as WorkoutStyle] ?? session.style} ·{" "}
              {formatDuration(session.durationSeconds)} · {session.exercises.length} exercises ·{" "}
              {totalSets} sets
            </p>
          </div>
          <button
            onClick={onDelete}
            aria-label={`Delete ${session.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cocoa-300 transition hover:bg-red-50 hover:text-red-600"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.exercises.slice(0, 5).map((ex) => (
            <span key={ex.id} className="chip">
              {ex.name}
            </span>
          ))}
          {session.exercises.length > 5 && (
            <span className="chip border-dashed">+{session.exercises.length - 5}</span>
          )}
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12.5px] font-semibold text-caramel-700 hover:text-caramel-800"
        >
          {expanded ? "Hide details" : "Show sets and reps"}
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-cocoa-200/60 pt-3">
              {session.exercises.map((ex) => (
                <div key={ex.id}>
                  <p className="text-[13px] font-semibold text-cocoa-800">{ex.name}</p>
                  <p className="text-[11px] text-cocoa-400">
                    {ex.muscleGroups
                      .map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g)
                      .join(" · ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ex.sets.map((set, i) => (
                      <span
                        key={set.id}
                        className={`rounded-lg px-2 py-1 text-[11.5px] font-medium tabular-nums ${
                          set.completed
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-cocoa-50 text-cocoa-400 line-through"
                        }`}
                      >
                        {i + 1}:{" "}
                        {set.reps != null ? `${set.reps} reps` : set.seconds != null ? `${set.seconds}s` : "—"}
                        {set.weight != null ? ` @ ${set.weight}${set.weightUnit}` : ""}
                      </span>
                    ))}
                  </div>
                  {ex.notes && (
                    <p className="mt-1.5 text-[12px] italic text-cocoa-600">&ldquo;{ex.notes}&rdquo;</p>
                  )}
                </div>
              ))}

              {session.notes && (
                <p className="rounded-xl bg-cream/80 px-3 py-2.5 text-[12.5px] leading-relaxed text-cocoa-700">
                  {session.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
