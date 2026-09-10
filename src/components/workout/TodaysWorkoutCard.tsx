"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils";
import { useStartSession } from "./useStartSession";
import { WORKOUT_STYLE_LABELS, type WorkoutStyle } from "@/lib/types";

export function TodaysWorkoutCard({
  workoutId,
  name,
  style,
  exerciseNames,
  estimatedMinutes,
  completed,
  completedDuration,
  activeSessionId,
}: {
  workoutId: string;
  name: string;
  style: string;
  exerciseNames: string[];
  estimatedMinutes: number;
  completed: boolean;
  completedDuration: number | null;
  activeSessionId: string | null;
}) {
  const { start, busyId, dialog } = useStartSession();

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-grad-cocoa px-5 py-5 text-cream sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-cream/60">
              {completed ? "Completed today" : "Planned for today"}
            </p>
            <h3 className="heading mt-1.5 truncate text-2xl font-semibold">{name}</h3>
            <p className="mt-1 text-[13px] text-cream/70">
              {WORKOUT_STYLE_LABELS[style as WorkoutStyle] ?? style} · {exerciseNames.length} exercises ·{" "}
              {completed && completedDuration
                ? formatDuration(completedDuration)
                : `about ${estimatedMinutes} min`}
            </p>
          </div>

          {completed && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream/15 text-xl"
              aria-label="Completed"
            >
              ✓
            </motion.span>
          )}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          {exerciseNames.slice(0, 6).map((exercise) => (
            <span key={exercise} className="chip">
              {exercise}
            </span>
          ))}
          {exerciseNames.length > 6 && (
            <span className="chip border-dashed">+{exerciseNames.length - 6} more</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {completed ? (
            <>
              <p className="flex-1 text-sm text-cocoa-600">
                Nice work — that&rsquo;s today&rsquo;s session done.
              </p>
              <Link href="/history">
                <Button variant="secondary" size="sm">
                  View in history
                </Button>
              </Link>
            </>
          ) : activeSessionId ? (
            <Link href={`/workouts/session/${activeSessionId}`} className="w-full sm:w-auto">
              <Button fullWidth>Resume workout</Button>
            </Link>
          ) : (
            <>
              <Button
                onClick={() => start(workoutId, { workoutName: name })}
                loading={busyId === workoutId}
                className="flex-1 sm:flex-none"
              >
                Start workout
              </Button>
              <Link href={`/workouts/${workoutId}`}>
                <Button variant="secondary">Edit plan</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {dialog}
    </Card>
  );
}
