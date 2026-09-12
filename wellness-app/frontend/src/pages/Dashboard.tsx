import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Beef, Droplet, Footprints, Dumbbell, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { dashboardApi, aiApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import ProgressRing from "../components/ProgressRing";
import StatTile from "../components/StatTile";
import QuickActionButtons from "../components/QuickActionButtons";
import QuickLogSheet, { type QuickLogType } from "../components/quickLog/QuickLogSheet";

export default function Dashboard() {
  const { user } = useAuth();
  const [quickLog, setQuickLog] = useState<QuickLogType | null>(null);

  const { data: dash, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get });
  const { data: coach } = useQuery({ queryKey: ["ai", "coach-today"], queryFn: aiApi.today, retry: false });

  if (isLoading || !dash) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">Loading your dashboard…</div>
    );
  }

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-4 px-4 pt-4 md:px-0 md:pt-0">
      <header className="md:flex md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand-600 dark:text-brand-400">{dash.greeting}</p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-gray-50 md:text-3xl">
            {firstName ? `Hi ${firstName}` : "Welcome back"}
          </h1>
        </div>
        <div className="mt-3 hidden w-64 md:block">
          <QuickActionButtons onSelect={setQuickLog} compact />
        </div>
      </header>

      <div className="md:hidden">
        <QuickActionButtons onSelect={setQuickLog} />
      </div>

      <div className="gap-4 space-y-4 md:grid md:grid-cols-3 md:space-y-0">
        {/* Main column */}
        <div className="space-y-4 md:col-span-2">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {dash.weight.current != null ? dash.weight.current.toFixed(1) : "—"} <span className="text-base font-medium text-gray-400">lbs</span>
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Goal: {dash.weight.goal ?? "—"} lbs</p>
              <p className="text-xs text-gray-400">
                {dash.weight.poundsLost != null ? `${dash.weight.poundsLost.toFixed(1)} lbs lost` : "Log your starting weight to track progress"}
                {dash.weight.poundsRemaining != null && dash.weight.poundsRemaining > 0 ? ` · ${dash.weight.poundsRemaining.toFixed(1)} to go` : ""}
              </p>
            </div>
            <ProgressRing percent={dash.weight.progressPct ?? 0} sublabel="to goal" />
          </Card>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Today</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                icon={<Flame size={14} />}
                label="Nutrition"
                value={`${Math.round(dash.nutrition.totals.calories)}${dash.nutrition.targets.calories ? ` / ${dash.nutrition.targets.calories}` : ""}`}
                unit="cal"
                progress={dash.nutrition.targets.calories ? { current: dash.nutrition.totals.calories, target: dash.nutrition.targets.calories } : undefined}
              />
              <StatTile
                icon={<Beef size={14} />}
                label="Protein"
                value={`${Math.round(dash.nutrition.totals.protein)}${dash.nutrition.targets.protein ? ` / ${dash.nutrition.targets.protein}` : ""}`}
                unit="g"
                progress={dash.nutrition.targets.protein ? { current: dash.nutrition.totals.protein, target: dash.nutrition.targets.protein } : undefined}
              />
              <StatTile
                icon={<Droplet size={14} />}
                label="Water"
                value={`${Math.round(dash.water.totalOz)}${dash.water.targetOz ? ` / ${dash.water.targetOz}` : ""}`}
                unit="oz"
                progress={dash.water.targetOz ? { current: dash.water.totalOz, target: dash.water.targetOz } : undefined}
              />
              <StatTile
                icon={<Footprints size={14} />}
                label="Steps"
                value={`${dash.steps.today.toLocaleString()}${dash.steps.target ? ` / ${dash.steps.target.toLocaleString()}` : ""}`}
                progress={dash.steps.target ? { current: dash.steps.today, target: dash.steps.target } : undefined}
              />
            </div>
            {dash.workouts.length > 0 ? (
              <Card className="mt-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <Dumbbell size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {dash.workouts[0].type.replace(/_/g, " ")} {dash.workouts[0].durationMinutes ? `— ${dash.workouts[0].durationMinutes} min` : ""}
                  </p>
                  <p className="text-xs text-gray-400">Logged today</p>
                </div>
              </Card>
            ) : null}
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Body metrics</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="BMI" value={dash.weight.bmi ?? "—"} />
              <StatTile label="Waist" value={dash.bodyMeasurement?.waist ?? "—"} unit="in" />
              <StatTile
                label="Blood pressure"
                value={dash.bloodPressure ? `${dash.bloodPressure.systolic}/${dash.bloodPressure.diastolic}` : "—"}
              />
              <StatTile label="Resting HR" value={dash.vitals?.restingHeartRate ?? "—"} unit="bpm" />
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="space-y-4 md:col-span-1">
          <Card>
            <div className="mb-2 flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
              <Sparkles size={16} />
              <h2 className="text-xs font-bold uppercase tracking-wider">Coach says</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
              {coach?.summary ?? "Log a bit more today and your coach will have something to say."}
            </p>
            {coach?.recommendations?.[0] && (
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{coach.recommendations[0]}</p>
            )}
            <Link to="/coach" className="mt-3 inline-block text-sm font-semibold text-brand-600 dark:text-brand-400">
              Ask your coach →
            </Link>
          </Card>

          <Card title="Today's priorities">
            <ul className="space-y-2.5">
              {dash.priorities.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  {p.done ? <CheckCircle2 size={18} className="shrink-0 text-brand-500" /> : <Circle size={18} className="shrink-0 text-gray-300 dark:text-gray-600" />}
                  <span className={p.done ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}>{p.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <QuickLogSheet type={quickLog} onClose={() => setQuickLog(null)} />
    </div>
  );
}
