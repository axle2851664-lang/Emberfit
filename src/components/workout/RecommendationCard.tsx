"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/client";
import { useStartSession } from "./useStartSession";
import type { Recommendation } from "@/lib/services/recommendationService";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/types";

/**
 * Shows what the app suggests training next and why. The reasoning is always
 * visible — a recommendation you can't interrogate isn't worth following.
 */
export function RecommendationCard({
  recommendation,
  compact,
}: {
  recommendation: Recommendation;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const { start, dialog: startDialog } = useStartSession();

  const usable = recommendation.exercises.filter((e) => e.exerciseId);

  const saveAsWorkout = async (thenStart: boolean) => {
    if (!usable.length) {
      toast.error("Those exercises aren't in your library yet.", "Run the seed script, or build the workout by hand.");
      return;
    }
    thenStart ? setStarting(true) : setSaving(true);

    const created = await apiPost<{ id: string }>("/api/workouts", {
      name: recommendation.title,
      description: recommendation.reason,
      style: recommendation.style,
      estimatedMinutes: recommendation.estimatedMinutes,
      scheduledFor: new Date().toISOString(),
      exercises: usable.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.sets,
        targetReps: e.reps,
        targetSeconds: e.seconds,
      })),
    });

    if (!created.ok) {
      setSaving(false);
      setStarting(false);
      toast.error(created.error.message, created.error.hint);
      return;
    }

    if (!thenStart) {
      setSaving(false);
      toast.success("Saved to your workouts", "It's scheduled for today.");
      router.push(`/workouts/${created.data.id}`);
      router.refresh();
      return;
    }

    // The shared hook handles the "something else is already running" case.
    await start(created.data.id, { workoutName: recommendation.title });
    setStarting(false);
  };

  return (
    <Card className={compact ? "p-4" : undefined}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-caramel-100 text-lg"
        >
          {recommendation.restAdvised ? "🌿" : "✨"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-caramel-700">
            {recommendation.restAdvised ? "Take it easy" : "Suggested for you"}
          </p>
          <h3 className="heading mt-1 text-lg font-semibold leading-tight">{recommendation.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-cocoa-600">{recommendation.reason}</p>
        </div>
      </div>

      {!compact && (
        <ul className="mt-5 space-y-1.5">
          {recommendation.exercises.map((exercise) => (
            <li
              key={exercise.name}
              className="flex items-center gap-3 rounded-xl bg-cream/70 px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-cocoa-900">{exercise.name}</span>
                <span className="block truncate text-[11.5px] text-cocoa-500">
                  {exercise.muscleGroups
                    .map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-cocoa-700">
                {exercise.seconds
                  ? `${exercise.sets ?? 1} × ${exercise.seconds}s`
                  : `${exercise.sets ?? 3} × ${exercise.reps ?? 10}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {recommendation.note && (
        <p className="mt-4 rounded-xl bg-cocoa-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cocoa-600">
          {recommendation.note}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button onClick={() => saveAsWorkout(true)} loading={starting} size={compact ? "sm" : "md"}>
          Start this
        </Button>
        <Button
          variant="secondary"
          size={compact ? "sm" : "md"}
          onClick={() => saveAsWorkout(false)}
          loading={saving}
        >
          Save for later
        </Button>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-cocoa-500">
        Suggestions come from what you&rsquo;ve logged recently and the preferences on your profile.
        Adjust anything that doesn&rsquo;t suit you — and skip it if your body says so.
      </p>

      {startDialog}
    </Card>
  );
}
