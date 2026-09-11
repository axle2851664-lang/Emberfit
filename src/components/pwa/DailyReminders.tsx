"use client";

import { useEffect } from "react";
import { maybeRemind } from "@/lib/notifications";

/**
 * Fires the reminders the Profile switches promise.
 *
 * Deliberately restrained: at most one of each per day, only late enough in the
 * day to be useful, and only when there is genuinely nothing logged. A reminder
 * that arrives after you have already trained is just noise, and this app is
 * not in the business of nagging anyone about food.
 *
 * These are local notifications — see src/lib/notifications.ts for why there is
 * no push server.
 */
export function DailyReminders({
  workoutRemindersOn,
  mealRemindersOn,
  hasPlannedWorkout,
  workoutDone,
  mealsLogged,
}: {
  workoutRemindersOn: boolean;
  mealRemindersOn: boolean;
  hasPlannedWorkout: boolean;
  workoutDone: boolean;
  mealsLogged: number;
}) {
  useEffect(() => {
    const hour = new Date().getHours();

    // Late afternoon: the planned session hasn't happened yet.
    void maybeRemind({
      enabled: workoutRemindersOn && hasPlannedWorkout && !workoutDone && hour >= 17 && hour < 22,
      kind: "workout",
      title: "Today's workout is still waiting",
      body: "Whenever suits — or skip it. Rest days count too.",
      url: "/workouts?start=1",
    });

    // Evening: nothing logged at all today.
    void maybeRemind({
      enabled: mealRemindersOn && mealsLogged === 0 && hour >= 19 && hour < 23,
      kind: "meal",
      title: "Nothing logged today",
      body: "Add a meal if you'd like to — a photo takes a few seconds.",
      url: "/food/add?mode=photo",
    });
  }, [workoutRemindersOn, mealRemindersOn, hasPlannedWorkout, workoutDone, mealsLogged]);

  return null;
}
