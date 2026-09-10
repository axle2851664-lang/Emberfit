"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { apiPost, apiPut } from "@/lib/client";
import { dayKey, dayKeyToDate } from "@/lib/utils";
import {
  MUSCLE_GROUP_LABELS,
  WORKOUT_STYLES,
  WORKOUT_STYLE_LABELS,
  type MuscleGroup,
  type WorkoutStyle,
} from "@/lib/types";
import type { PlainExercise, PlainWorkout } from "./types";

interface Row {
  key: string;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  targetSets: number | null;
  targetReps: number | null;
  targetSeconds: number | null;
  notes: string;
}

export function WorkoutEditor({
  workout,
  exercises,
}: {
  workout: PlainWorkout | null;
  exercises: PlainExercise[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(workout?.name ?? "");
  const [description, setDescription] = useState(workout?.description ?? "");
  const [style, setStyle] = useState<WorkoutStyle>((workout?.style as WorkoutStyle) ?? "strength");
  const [isTemplate, setIsTemplate] = useState(workout?.isTemplate ?? false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(workout?.estimatedMinutes ?? 40);
  const [scheduled, setScheduled] = useState<string>(
    workout?.scheduledFor ? dayKey(new Date(workout.scheduledFor)) : "",
  );
  const [rows, setRows] = useState<Row[]>(
    (workout?.exercises ?? []).map((e, i) => ({
      key: `row-${i}-${e.id}`,
      // The workout row carries the WorkoutExercise id; match back to the exercise by name.
      exerciseId: exercises.find((x) => x.name === e.name)?.id ?? "",
      name: e.name,
      muscleGroups: e.muscleGroups,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetSeconds: e.targetSeconds,
      notes: "",
    })),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExercise = (exercise: PlainExercise) => {
    setRows((current) => [
      ...current,
      {
        key: `row-${Date.now()}-${exercise.id}`,
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroups: exercise.muscleGroups,
        targetSets: exercise.category === "cardio" ? 1 : 3,
        targetReps: exercise.category === "cardio" || exercise.category === "mobility" ? null : 10,
        targetSeconds: exercise.category === "cardio" ? 600 : null,
        notes: "",
      },
    ]);
  };

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const remove = (key: string) => setRows((current) => current.filter((row) => row.key !== key));

  const move = (key: string, direction: -1 | 1) =>
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("Give the workout a name.");
    if (!rows.length) return setError("Add at least one exercise.");
    if (rows.some((row) => !row.exerciseId)) {
      return setError("One of these exercises couldn't be matched. Remove it and add it again.");
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      style,
      isTemplate,
      estimatedMinutes,
      scheduledFor: scheduled ? dayKeyToDate(scheduled).toISOString() : null,
      exercises: rows.map((row) => ({
        exerciseId: row.exerciseId,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        targetSeconds: row.targetSeconds,
        notes: row.notes || null,
      })),
    };

    const res = workout
      ? await apiPut<{ id: string }>(`/api/workouts/${workout.id}`, payload)
      : await apiPost<{ id: string }>("/api/workouts", payload);
    setSaving(false);

    if (!res.ok) {
      setError(res.error.hint ? `${res.error.message} ${res.error.hint}` : res.error.message);
      return;
    }
    toast.success(workout ? "Workout updated" : "Workout created");
    router.push("/workouts");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl font-semibold">
            {workout ? "Edit workout" : "New workout"}
          </h1>
          <p className="mt-1 text-sm text-cocoa-600">
            Set the exercises and targets. You can change anything mid-session.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {workout ? "Save changes" : "Create workout"}
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-1">
          <CardHeader title="Details" />
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="w-name">Name</label>
              <input
                id="w-name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Upper body"
                maxLength={80}
              />
            </div>

            <div>
              <label className="label" htmlFor="w-desc">
                Description <span className="font-normal text-cocoa-400">(optional)</span>
              </label>
              <textarea
                id="w-desc"
                className="field min-h-[72px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this session is for"
                maxLength={300}
              />
            </div>

            <div>
              <span className="label">Style</span>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`pill-toggle text-[13px] ${style === s ? "pill-on" : "pill-off"}`}
                  >
                    {WORKOUT_STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <div>
                <label className="label" htmlFor="w-mins">Approx. minutes</label>
                <input
                  id="w-mins"
                  type="number"
                  min={5}
                  max={180}
                  className="field"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 40)}
                />
              </div>
              <div>
                <label className="label" htmlFor="w-date">Planned for</label>
                <input
                  id="w-date"
                  type="date"
                  className="field"
                  value={scheduled}
                  onChange={(e) => setScheduled(e.target.value)}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream/70 p-3.5">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={(e) => setIsTemplate(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-caramel-600"
              />
              <span>
                <span className="block text-[13.5px] font-semibold text-cocoa-900">
                  Save as a template
                </span>
                <span className="block text-[12px] leading-snug text-cocoa-500">
                  Templates stay in your library so you can start them again any time.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title={`Exercises (${rows.length})`}
            subtitle="Drag-free ordering — use the arrows to move things around."
            action={
              <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                Add exercise
              </Button>
            }
          />

          {rows.length === 0 ? (
            <EmptyState
              icon="🏋️"
              title="No exercises yet"
              message="Add exercises from the library, or create your own on the Workouts page."
              action={<Button onClick={() => setPickerOpen(true)}>Add an exercise</Button>}
            />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {rows.map((row, index) => (
                  <motion.li
                    key={row.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-2xl border border-cocoa-200/60 bg-cream/60 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cocoa-800 text-[12px] font-bold text-cream">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-cocoa-900">{row.name}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-cocoa-500">
                          {row.muscleGroups
                            .map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton label="Move up" onClick={() => move(row.key, -1)} disabled={index === 0}>
                          ↑
                        </IconButton>
                        <IconButton
                          label="Move down"
                          onClick={() => move(row.key, 1)}
                          disabled={index === rows.length - 1}
                        >
                          ↓
                        </IconButton>
                        <IconButton label="Remove" onClick={() => remove(row.key)} danger>
                          ×
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <NumberField
                        label="Sets"
                        value={row.targetSets}
                        onChange={(v) => update(row.key, { targetSets: v })}
                        max={20}
                      />
                      <NumberField
                        label="Reps"
                        value={row.targetReps}
                        onChange={(v) => update(row.key, { targetReps: v })}
                        max={200}
                      />
                      <NumberField
                        label="Seconds"
                        value={row.targetSeconds}
                        onChange={(v) => update(row.key, { targetSeconds: v })}
                        max={7200}
                      />
                    </div>

                    <input
                      className="field mt-2 py-2 text-[13px]"
                      placeholder="Note for this exercise (optional)"
                      value={row.notes}
                      onChange={(e) => update(row.key, { notes: e.target.value })}
                      maxLength={200}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
              {error}
            </p>
          )}
        </Card>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        onPick={addExercise}
      />
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition disabled:opacity-30 ${
        danger
          ? "text-cocoa-400 hover:bg-red-50 hover:text-red-600"
          : "text-cocoa-500 hover:bg-cocoa-100 hover:text-cocoa-800"
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cocoa-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        className="field py-2 text-[13px]"
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), max) : null);
        }}
      />
    </label>
  );
}

export function ExercisePicker({
  open,
  onClose,
  exercises,
  onPick,
  closeOnPick,
}: {
  open: boolean;
  onClose: () => void;
  exercises: PlainExercise[];
  onPick: (exercise: PlainExercise) => void;
  closeOnPick?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises.slice(0, 60);
    return exercises
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscleGroups.some((g) => g.includes(q)) ||
          e.equipment.some((eq) => eq.includes(q)),
      )
      .slice(0, 60);
  }, [exercises, query]);

  const pick = (exercise: PlainExercise) => {
    onPick(exercise);
    setAdded((current) => [...current, exercise.id]);
    if (closeOnPick) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setAdded([]);
        onClose();
      }}
      title="Add exercises"
      subtitle="Tap as many as you want — the sheet stays open."
      size="md"
    >
      <div className="sticky top-0 -mx-5 mb-3 bg-cream px-5 pb-3 pt-1 sm:-mx-6 sm:px-6">
        <SearchBar value={query} onChange={setQuery} placeholder="Search the library…" autoFocus />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing matches"
          message="Try a different word, or create a custom exercise from the Workouts page."
        />
      ) : (
        <ul className="space-y-1.5 pb-2">
          {filtered.map((exercise) => {
            const justAdded = added.includes(exercise.id);
            return (
              <li key={exercise.id}>
                <button
                  onClick={() => pick(exercise)}
                  className="flex w-full items-center gap-3 rounded-xl border border-cocoa-200/60 bg-white/70 px-3.5 py-3 text-left transition hover:border-caramel-300 hover:bg-white"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-cocoa-900">
                      {exercise.name}
                      {exercise.isCustom && (
                        <span className="ml-2 text-[10.5px] font-semibold uppercase text-caramel-700">
                          Custom
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11.5px] text-cocoa-500">
                      {exercise.muscleGroups
                        .map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g)
                        .join(" · ")}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[12px] font-bold ${
                      justAdded ? "text-emerald-600" : "text-caramel-600"
                    }`}
                  >
                    {justAdded ? "Added ✓" : "+ Add"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
