import Link from "next/link";
import { prisma, getCurrentUser } from "@/lib/db";
import { getDaySummary, getMealsForDay } from "@/lib/services/mealService";
import { getActiveSession, getTodaysWorkout, getTrainingStats } from "@/lib/services/workoutService";
import { getRecommendation } from "@/lib/services/recommendationService";
import { nutritionNotes } from "@/lib/services/nutritionService";
import { dayKey, formatDuration, parseList } from "@/lib/utils";
import { Card, SectionTitle } from "@/components/ui/Card";
import { MacroBar, NutritionSummary, EstimateBadge } from "@/components/ui/Nutrition";
import { StatTile } from "@/components/charts/Charts";
import { EmptyState } from "@/components/ui/States";
import { QuickActions } from "@/components/QuickActions";
import { DailyReminders } from "@/components/pwa/DailyReminders";
import { TodaysWorkoutCard } from "@/components/workout/TodaysWorkoutCard";
import { RecommendationCard } from "@/components/workout/RecommendationCard";
import { MEAL_SLOT_LABELS, type MealSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const today = dayKey();

  // One round of parallel reads keeps the dashboard snappy.
  const [summary, meals, todaysWorkout, activeSession, stats, recommendation, recentSessions] =
    await Promise.all([
      getDaySummary(user.id, today),
      getMealsForDay(user.id, today),
      getTodaysWorkout(user.id),
      getActiveSession(user.id),
      getTrainingStats(user.id, 30),
      getRecommendation(user.id),
      prisma.workoutSession.findMany({
        where: { userId: user.id, status: "completed" },
        include: { exercises: true },
        orderBy: { completedAt: "desc" },
        take: 4,
      }),
    ]);

  const notes = nutritionNotes(summary.totals, summary.mealCount);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-7">
      {/* Header ------------------------------------------------------------ */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-cocoa-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="heading mt-1 text-[27px] font-semibold leading-tight sm:text-4xl">
            {greeting()}, {firstName}.
          </h1>
        </div>
        {stats.currentStreakDays > 0 && (
          <span className="chip border-caramel-200 bg-caramel-50 text-caramel-800">
            🔥 {stats.currentStreakDays}-day streak
          </span>
        )}
      </header>

      <QuickActions hasActiveSession={Boolean(activeSession)} activeSessionId={activeSession?.id} />

      <DailyReminders
        workoutRemindersOn={user.profile?.notifyWorkoutReminders ?? false}
        mealRemindersOn={user.profile?.notifyMealReminders ?? false}
        hasPlannedWorkout={Boolean(todaysWorkout)}
        workoutDone={Boolean(todaysWorkout?.completed)}
        mealsLogged={summary.mealCount}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column ---------------------------------------------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <section>
            <SectionTitle
              action={
                <Link href="/workouts" className="text-[13px] font-semibold text-caramel-700 hover:text-caramel-800">
                  All workouts →
                </Link>
              }
            >
              Today&rsquo;s training
            </SectionTitle>

            {todaysWorkout ? (
              <TodaysWorkoutCard
                workoutId={todaysWorkout.workout.id}
                name={todaysWorkout.workout.name}
                style={todaysWorkout.workout.style}
                exerciseNames={todaysWorkout.workout.exercises.map((e) => e.exercise.name)}
                estimatedMinutes={todaysWorkout.workout.estimatedMinutes}
                completed={todaysWorkout.completed}
                completedDuration={todaysWorkout.session?.durationSeconds ?? null}
                activeSessionId={activeSession?.id ?? null}
              />
            ) : (
              <RecommendationCard recommendation={recommendation} />
            )}
          </section>

          {/* Nutrition today ---------------------------------------------- */}
          <section>
            <SectionTitle
              action={
                <Link href="/history?tab=nutrition" className="text-[13px] font-semibold text-caramel-700 hover:text-caramel-800">
                  Nutrition history →
                </Link>
              }
            >
              Eaten today
            </SectionTitle>

            <Card>
              {summary.mealCount === 0 ? (
                <EmptyState
                  icon="🍽️"
                  title="Nothing logged yet"
                  message="Snap a photo, scan a barcode, or add a home-cooked meal from its ingredients."
                  action={
                    <Link
                      href="/food/add"
                      className="inline-flex h-11 items-center rounded-xl bg-grad-ember px-5 text-sm font-semibold text-white shadow-soft"
                    >
                      Add a meal
                    </Link>
                  }
                />
              ) : (
                <>
                  <NutritionSummary nutrients={summary.totals} showExtended />
                  <MacroBar split={summary.split} className="mt-5" />
                  <ul className="mt-5 space-y-1.5">
                    {notes.map((note) => (
                      <li key={note} className="text-[13px] leading-relaxed text-cocoa-600">
                        · {note}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 space-y-2 border-t border-cocoa-200/60 pt-4">
                    {meals.map((meal) => {
                      const calories = meal.items.reduce((sum, i) => sum + i.calories, 0);
                      return (
                        <Link
                          key={meal.id}
                          href={`/food?day=${today}#meal-${meal.id}`}
                          className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-cream"
                        >
                          <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-cocoa-500">
                            {MEAL_SLOT_LABELS[meal.slot as MealSlot] ?? "Snack"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-cocoa-800">
                            {meal.name}
                          </span>
                          {meal.isEstimate && <EstimateBadge confidence={meal.confidence} />}
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-cocoa-700">
                            {Math.round(calories)} kcal
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          </section>
        </div>

        {/* Right column --------------------------------------------------- */}
        <div className="min-w-0 space-y-5">
          <section>
            <SectionTitle>This month</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatTile value={stats.last7} label="Workouts" caption="last 7 days" accent />
              <StatTile value={stats.last30} label="Workouts" caption="last 30 days" />
              <StatTile value={formatDuration(stats.totalMinutes * 60)} label="Time trained" caption="last 30 days" />
              <StatTile value={stats.totalSessions} label="All time" caption="sessions logged" />
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/history" className="text-[13px] font-semibold text-caramel-700 hover:text-caramel-800">
                  See all →
                </Link>
              }
            >
              Recent workouts
            </SectionTitle>

            <Card className="p-4">
              {recentSessions.length === 0 ? (
                <EmptyState
                  icon="🏋️"
                  title="No sessions yet"
                  message="Your finished workouts will show up here."
                  className="py-8"
                />
              ) : (
                <ul className="space-y-1">
                  {recentSessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={`/history#session-${session.id}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-cream"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cocoa-100 text-sm">
                          {session.style === "cardio" ? "🏃" : session.style === "mobility" ? "🧘" : "🏋️"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-cocoa-900">
                            {session.name}
                          </span>
                          <span className="block text-[11.5px] text-cocoa-500">
                            {session.completedAt?.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {session.exercises.length} exercises ·{" "}
                            {formatDuration(session.durationSeconds)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {todaysWorkout && (
            <section>
              <SectionTitle>Suggested next</SectionTitle>
              <RecommendationCard recommendation={recommendation} compact />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
