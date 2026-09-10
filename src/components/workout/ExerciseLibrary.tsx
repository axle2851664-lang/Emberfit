"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { apiDelete, apiPost } from "@/lib/client";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type MuscleGroup,
} from "@/lib/types";
import type { PlainExercise } from "./types";

const CATEGORIES = ["strength", "cardio", "mobility", "conditioning"] as const;

export function ExerciseLibrary({ exercises }: { exercises: PlainExercise[] }) {
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (group !== "all" && !e.muscleGroups.includes(group)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.muscleGroups.some((g) => g.includes(q)) ||
        e.equipment.some((eq) => eq.includes(q))
      );
    });
  }, [exercises, query, group]);

  const removeCustom = async (exercise: PlainExercise) => {
    const res = await apiDelete(`/api/exercises/${exercise.id}`);
    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    toast.success(`Removed "${exercise.name}"`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search exercises, muscles or equipment…"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
          Create exercise
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={group === "all"} onClick={() => setGroup("all")}>
          All
        </FilterChip>
        {MUSCLE_GROUPS.map((g) => (
          <FilterChip key={g} active={group === g} onClick={() => setGroup(g)}>
            {MUSCLE_GROUP_LABELS[g]}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔍"
            title="No exercises match"
            message="Try a different search or filter — or create your own exercise."
            action={<Button onClick={() => setCreateOpen(true)}>Create exercise</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exercise, i) => (
            <Card key={exercise.id} delay={i % 9} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-tight text-cocoa-900">{exercise.name}</h3>
                {exercise.isCustom && (
                  <button
                    onClick={() => removeCustom(exercise)}
                    className="shrink-0 text-[11px] font-semibold text-cocoa-400 transition hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {exercise.muscleGroups.map((g) => (
                  <span key={g} className="chip text-[10.5px]">
                    {MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g}
                  </span>
                ))}
              </div>
              {exercise.instructions && (
                <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-cocoa-600">
                  {exercise.instructions}
                </p>
              )}
              <p className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-cocoa-400">
                {exercise.equipment.map((eq) => EQUIPMENT_LABELS[eq as Equipment] ?? eq).join(" · ") ||
                  "No equipment"}
              </p>
            </Card>
          ))}
        </div>
      )}

      <CreateExerciseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`pill-toggle shrink-0 text-[13px] ${active ? "pill-on" : "pill-off"}`}>
      {children}
    </button>
  );
}

function CreateExerciseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("strength");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const reset = () => {
    setName("");
    setGroups([]);
    setEquipment([]);
    setCategory("strength");
    setInstructions("");
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("Give the exercise a name.");
    if (!groups.length) return setError("Pick at least one muscle group.");

    setSaving(true);
    const res = await apiPost("/api/exercises", {
      name: name.trim(),
      muscleGroups: groups,
      equipment,
      category,
      instructions: instructions.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      setError(res.error.hint ? `${res.error.message} ${res.error.hint}` : res.error.message);
      return;
    }
    toast.success(`Added "${name.trim()}"`, "It's in your library now.");
    reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create an exercise"
      subtitle="Anything the built-in library is missing."
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth onClick={save} loading={saving}>
            Save exercise
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div>
          <label className="label" htmlFor="ex-name">
            Name
          </label>
          <input
            id="ex-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bulgarian split squat"
            maxLength={80}
          />
        </div>

        <div>
          <span className="label">Muscle groups</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => toggle(groups, setGroups, g)}
                className={`pill-toggle text-[13px] ${groups.includes(g) ? "pill-on" : "pill-off"}`}
              >
                {MUSCLE_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Equipment</span>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((eq) => (
              <button
                key={eq}
                onClick={() => toggle(equipment, setEquipment, eq)}
                className={`pill-toggle text-[13px] ${equipment.includes(eq) ? "pill-on" : "pill-off"}`}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`pill-toggle text-[13px] capitalize ${category === c ? "pill-on" : "pill-off"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ex-notes">
            How to do it <span className="font-normal text-cocoa-400">(optional)</span>
          </label>
          <textarea
            id="ex-notes"
            className="field min-h-[80px] resize-y"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="A short cue you want to remember"
            maxLength={400}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">{error}</p>
        )}
      </div>
    </Modal>
  );
}
