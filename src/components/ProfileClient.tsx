"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiPut } from "@/lib/client";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  WORKOUT_STYLES,
  WORKOUT_STYLE_LABELS,
} from "@/lib/types";

interface ProfileState {
  name: string;
  interests: string[];
  preferredStyles: string[];
  equipment: string[];
  sessionMinutes: number;
  daysPerWeek: number;
  experience: string;
  notifyWorkoutReminders: boolean;
  notifyMealReminders: boolean;
  storePhotos: boolean;
  shareAnonymousStats: boolean;
}

const INTERESTS = [
  "General fitness",
  "Building strength",
  "Running",
  "Cycling",
  "Team sports",
  "Climbing",
  "Yoga",
  "Swimming",
  "Feeling more mobile",
  "Staying consistent",
];

const EXPERIENCE = [
  { key: "beginner", label: "New to this", caption: "Suggestions stay simple and gentle" },
  { key: "intermediate", label: "Comfortable", caption: "A mix of familiar and harder work" },
  { key: "advanced", label: "Experienced", caption: "The full exercise library" },
];

export function ProfileClient({
  initial,
  services,
}: {
  initial: ProfileState;
  services: { visionConfigured: boolean; remoteFoodEnabled: boolean };
}) {
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<ProfileState>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof ProfileState>(key: K, value: ProfileState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const toggleIn = (key: "interests" | "preferredStyles" | "equipment", value: string) => {
    const list = state[key];
    set(key, list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const save = async () => {
    if (!state.name.trim()) {
      toast.error("Your name can't be empty.");
      return;
    }
    setSaving(true);
    const res = await apiPut("/api/profile", { ...state, name: state.name.trim() });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error.message, res.error.hint);
      return;
    }
    setDirty(false);
    toast.success("Profile saved", "Your workout suggestions will use this from now on.");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-3xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-cocoa-600">
            These preferences shape what the app suggests. Nothing here is required.
          </p>
        </div>
        <Button onClick={save} loading={saving} disabled={!dirty}>
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </header>

      <Card>
        <CardHeader title="About you" />
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="p-name">Name</label>
            <input
              id="p-name"
              className="field sm:max-w-sm"
              value={state.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={60}
            />
            <p className="mt-1.5 text-[11.5px] text-cocoa-500">
              Used only to greet you. It never leaves this device&rsquo;s database.
            </p>
          </div>

          <div>
            <span className="label">How experienced are you?</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXPERIENCE.map((option) => (
                <button
                  key={option.key}
                  onClick={() => set("experience", option.key)}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    state.experience === option.key
                      ? "border-transparent bg-cocoa-800 text-cream shadow-soft"
                      : "border-cocoa-200 bg-white/70 hover:border-cocoa-300 hover:bg-white"
                  }`}
                >
                  <span className="block text-[13.5px] font-semibold">{option.label}</span>
                  <span
                    className={`mt-0.5 block text-[11.5px] leading-snug ${
                      state.experience === option.key ? "text-cream/65" : "text-cocoa-500"
                    }`}
                  >
                    {option.caption}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="What you're into"
          subtitle="Pick anything that fits — it nudges the kind of workouts suggested."
        />
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleIn("interests", interest)}
              className={`pill-toggle text-[13px] ${
                state.interests.includes(interest) ? "pill-on" : "pill-off"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Preferred workout types"
          subtitle="Suggestions lean towards these when they make sense."
        />
        <div className="flex flex-wrap gap-1.5">
          {WORKOUT_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => toggleIn("preferredStyles", style)}
              className={`pill-toggle text-[13px] ${
                state.preferredStyles.includes(style) ? "pill-on" : "pill-off"
              }`}
            >
              {WORKOUT_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Equipment you can use"
          subtitle="Suggestions only include exercises you can actually do. Bodyweight is always assumed."
        />
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT.map((item) => (
            <button
              key={item}
              onClick={() => toggleIn("equipment", item)}
              className={`pill-toggle text-[13px] ${
                state.equipment.includes(item) ? "pill-on" : "pill-off"
              }`}
            >
              {EQUIPMENT_LABELS[item]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="How you like to train" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-minutes">
              Typical session length: <span className="text-caramel-700">{state.sessionMinutes} min</span>
            </label>
            <input
              id="p-minutes"
              type="range"
              min={10}
              max={120}
              step={5}
              value={state.sessionMinutes}
              onChange={(e) => set("sessionMinutes", Number(e.target.value))}
              className="w-full accent-caramel-600"
            />
          </div>
          <div>
            <label className="label" htmlFor="p-days">
              Days per week you aim for:{" "}
              <span className="text-caramel-700">{state.daysPerWeek}</span>
            </label>
            <input
              id="p-days"
              type="range"
              min={1}
              max={7}
              value={state.daysPerWeek}
              onChange={(e) => set("daysPerWeek", Number(e.target.value))}
              className="w-full accent-caramel-600"
            />
            <p className="mt-1.5 text-[11.5px] text-cocoa-500">
              Used to suggest an easier day when you&rsquo;ve gone well past it.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" />
        <div className="space-y-2.5">
          <Toggle
            label="Workout reminders"
            caption="A nudge on days you planned to train."
            checked={state.notifyWorkoutReminders}
            onChange={(v) => set("notifyWorkoutReminders", v)}
          />
          <Toggle
            label="Meal logging reminders"
            caption="A gentle prompt if you haven't logged anything by evening."
            checked={state.notifyMealReminders}
            onChange={(v) => set("notifyMealReminders", v)}
          />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-cocoa-500">
          These preferences are stored now; delivery depends on how you host the app.
        </p>
      </Card>

      <Card>
        <CardHeader title="Privacy" subtitle="Short version: your data stays in your own database." />
        <div className="space-y-2.5">
          <Toggle
            label="Keep food photos after analysis"
            caption="Off by default. Photos are analysed in memory and discarded — nothing is written to disk."
            checked={state.storePhotos}
            onChange={(v) => set("storePhotos", v)}
          />
          <Toggle
            label="Share anonymous usage stats"
            caption="Off by default. Nothing is sent anywhere unless you turn this on."
            checked={state.shareAnonymousStats}
            onChange={(v) => set("shareAnonymousStats", v)}
          />
        </div>

        <div className="mt-5 space-y-2.5 rounded-2xl bg-cocoa-50 p-4 text-[12px] leading-relaxed text-cocoa-600">
          <p>
            <strong className="text-cocoa-800">What leaves your server.</strong> Product lookups
            send only the barcode number to Open Food Facts. Photo recognition
            {services.visionConfigured
              ? " sends the image to the Anthropic API, which returns food names only — no nutrition values."
              : " is not configured, so no image ever leaves this machine."}{" "}
            Everything else — workouts, meals, notes — stays local.
          </p>
          <p>
            <strong className="text-cocoa-800">Deleting things.</strong> Any meal can be removed
            from the food journal, and any session from your history. Deletes are immediate and
            permanent.
          </p>
          <p>
            <strong className="text-cocoa-800">What we don&rsquo;t collect.</strong> No weight, no
            body measurements, no calorie targets, no location, no contacts.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Services" subtitle="What this install can reach right now." />
        <ul className="space-y-2">
          <ServiceRow
            label="Built-in food composition table"
            ok
            detail="Always available, works offline."
          />
          <ServiceRow
            label="Product database (Open Food Facts)"
            ok={services.remoteFoodEnabled}
            detail={
              services.remoteFoodEnabled
                ? "Barcode lookups are enabled."
                : "Turned off. Set ENABLE_REMOTE_FOOD_LOOKUP=1 to enable barcode lookups."
            }
          />
          <ServiceRow
            label="Food photo recognition"
            ok={services.visionConfigured}
            detail={
              services.visionConfigured
                ? "Configured and ready."
                : "No API key set. The photo flow falls back to manual ingredient entry, which still works."
            }
          />
        </ul>
      </Card>

      <div className="pb-2">
        <Button fullWidth size="lg" onClick={save} loading={saving} disabled={!dirty}>
          {dirty ? "Save changes" : "Everything saved"}
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  caption,
  checked,
  onChange,
}: {
  label: string;
  caption: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-cream/70 p-3.5">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-cocoa-900">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-cocoa-500">{caption}</span>
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full bg-cocoa-200 transition peer-checked:bg-caramel-500" />
        <span className="absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function ServiceRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-cream/60 px-3.5 py-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-cocoa-200 text-cocoa-600"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-cocoa-900">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-cocoa-600">{detail}</span>
      </span>
    </li>
  );
}
