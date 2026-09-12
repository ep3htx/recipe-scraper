import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Trash2, Moon, Sun, Monitor } from "lucide-react";
import clsx from "clsx";
import { usersApi, goalsApi, vitalsApi, preferencesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Card from "../components/Card";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

const PREFERENCE_CATEGORIES = [
  { value: "favorite_foods", label: "Favorite foods" },
  { value: "disliked_foods", label: "Disliked foods" },
  { value: "dietary_restrictions", label: "Dietary restrictions" },
  { value: "cooking_prefs", label: "Cooking preferences" },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4 px-4 pt-4 md:mx-auto md:max-w-3xl md:px-0 md:pt-0">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-sm text-gray-400">{user?.email}</p>
      </header>

      <Card title="Appearance">
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium capitalize",
                theme === t ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300" : "border-gray-200 text-gray-500 dark:border-gray-700"
              )}
            >
              {t === "light" ? <Sun size={16} /> : t === "dark" ? <Moon size={16} /> : <Monitor size={16} />}
              {t}
            </button>
          ))}
        </div>
      </Card>

      <ProfileCard />
      <GoalsCard />
      <VitalRangesCard />
      <PreferencesCard />

      <button
        onClick={() => logout()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-3 text-sm font-semibold text-rose-600 dark:border-rose-900/50"
      >
        <LogOut size={16} /> Log out
      </button>
      <p className="pb-2 text-center text-[10px] text-gray-300 dark:text-gray-600">Wellness Dashboard · self-hosted</p>
    </div>
  );
}

function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [heightInches, setHeightInches] = useState(user?.heightInches?.toString() ?? "");
  const [unitSystem, setUnitSystem] = useState(user?.unitSystem ?? "imperial");

  const save = useMutation({
    mutationFn: () => usersApi.updateProfile({ name: name || undefined, heightInches: heightInches ? Number(heightInches) : undefined, unitSystem: unitSystem as "imperial" | "metric" }),
    onSuccess: refreshUser,
  });

  return (
    <Card title="Profile">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Height (inches) — used for BMI</label>
          <input inputMode="decimal" className={inputClass} value={heightInches} onChange={(e) => setHeightInches(e.target.value)} placeholder="68" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Units</label>
          <select className={inputClass} value={unitSystem} onChange={(e) => setUnitSystem(e.target.value as "imperial" | "metric")}>
            <option value="imperial">Imperial (lbs, in)</option>
            <option value="metric">Metric (kg, cm)</option>
          </select>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </Card>
  );
}

function GoalsCard() {
  const queryClient = useQueryClient();
  const { data: goal } = useQuery({ queryKey: ["goals"], queryFn: goalsApi.get });
  const [form, setForm] = useState<Record<string, string>>({});

  const fields: { key: string; label: string }[] = [
    { key: "startingWeight", label: "Starting weight (lbs)" },
    { key: "goalWeight", label: "Goal weight (lbs)" },
    { key: "calorieTarget", label: "Calorie target" },
    { key: "proteinTarget", label: "Protein target (g)" },
    { key: "waterTargetOz", label: "Water target (oz)" },
    { key: "stepsTarget", label: "Steps target" },
    { key: "workoutsPerWeek", label: "Workouts / week" },
  ];

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {};
      for (const f of fields) {
        const v = form[f.key] ?? (goal as unknown as Record<string, unknown> | null)?.[f.key];
        if (v !== undefined && v !== null && v !== "") payload[f.key] = Number(v);
      }
      return goalsApi.set(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  return (
    <Card title="Goals">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-gray-500">{f.label}</label>
            <input
              inputMode="decimal"
              className={inputClass}
              defaultValue={(goal as unknown as Record<string, unknown> | null)?.[f.key]?.toString() ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {save.isPending ? "Saving…" : "Save goals"}
      </button>
    </Card>
  );
}

function VitalRangesCard() {
  const queryClient = useQueryClient();
  const { data: ranges } = useQuery({ queryKey: ["vitals", "ranges"], queryFn: vitalsApi.getRanges });
  const [form, setForm] = useState<Record<string, string>>({});

  const fields: { key: string; label: string }[] = [
    { key: "systolicMin", label: "Systolic min" },
    { key: "systolicMax", label: "Systolic max" },
    { key: "diastolicMin", label: "Diastolic min" },
    { key: "diastolicMax", label: "Diastolic max" },
    { key: "restingHRMin", label: "Resting HR min" },
    { key: "restingHRMax", label: "Resting HR max" },
  ];

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {};
      for (const f of fields) {
        const v = form[f.key] ?? (ranges as Record<string, unknown>)?.[f.key];
        if (v !== undefined && v !== null && v !== "") payload[f.key] = Number(v);
      }
      return vitalsApi.setRanges(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vitals", "ranges"] }),
  });

  return (
    <Card title="Personal vital target ranges">
      <p className="mb-3 text-xs text-gray-400">
        Used only to flag your own readings as outside your normal range — never to diagnose. Set these with guidance from your doctor if you have specific targets.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-gray-500">{f.label}</label>
            <input
              inputMode="numeric"
              className={inputClass}
              defaultValue={(ranges as Record<string, unknown>)?.[f.key]?.toString() ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {save.isPending ? "Saving…" : "Save ranges"}
      </button>
    </Card>
  );
}

function PreferencesCard() {
  const queryClient = useQueryClient();
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: () => preferencesApi.list() });
  const [category, setCategory] = useState(PREFERENCE_CATEGORIES[0].value);
  const [value, setValue] = useState("");

  const add = useMutation({
    mutationFn: () => preferencesApi.set(category, value, value),
    onSuccess: () => {
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
  const remove = useMutation({ mutationFn: preferencesApi.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["preferences"] }) });

  return (
    <Card title="What your coach remembers">
      <p className="mb-3 text-xs text-gray-400">Favorite foods, dislikes, and dietary restrictions the AI Coach uses when planning meals. Add, review, or remove anything here.</p>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) add.mutate();
        }}
      >
        <select className={clsx(inputClass, "w-36 flex-none")} value={category} onChange={(e) => setCategory(e.target.value)}>
          {PREFERENCE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. peanuts" />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {prefs?.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs dark:bg-gray-800">
            <span className="text-gray-400">{PREFERENCE_CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}:</span> {String(p.value)}
            <button onClick={() => remove.mutate(p.id)} className="text-gray-400 hover:text-rose-500">
              <Trash2 size={11} />
            </button>
          </span>
        ))}
        {!prefs?.length && <p className="text-xs text-gray-400">Nothing saved yet.</p>}
      </div>
    </Card>
  );
}
