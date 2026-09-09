import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { progressApi } from "../api/endpoints";
import { downloadFile } from "../api/download";
import Card from "../components/Card";
import LineChartCard from "../components/LineChartCard";

const METRICS: { value: string; label: string; unit?: string; color?: string }[] = [
  { value: "weight", label: "Weight", unit: " lbs" },
  { value: "weight7dAvg", label: "Weight (7-day avg)", unit: " lbs", color: "#8b5cf6" },
  { value: "waist", label: "Waist", unit: " in", color: "#f59e0b" },
  { value: "bodyFat", label: "Body Fat %", unit: "%", color: "#ec4899" },
  { value: "heartRate", label: "Resting HR", unit: " bpm", color: "#ef4444" },
  { value: "calories", label: "Calories", color: "#16a367" },
  { value: "protein", label: "Protein", unit: "g", color: "#0ea5e9" },
  { value: "steps", label: "Steps", color: "#6366f1" },
  { value: "exerciseMinutes", label: "Exercise Minutes", unit: " min", color: "#14b8a6" },
  { value: "water", label: "Water", unit: " oz", color: "#38bdf8" },
  { value: "sleep", label: "Sleep", unit: " hrs", color: "#a855f7" },
];

const PERIODS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export default function Progress() {
  const [metric, setMetric] = useState("weight");
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["progress", "chart", metric, period],
    queryFn: () => progressApi.chart(metric, period),
  });
  const { data: weekly } = useQuery({ queryKey: ["progress", "weekly-report"], queryFn: progressApi.weeklyReport });

  const activeMetric = METRICS.find((m) => m.value === metric)!;

  return (
    <div className="space-y-4 px-4 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Progress</h1>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {METRICS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              metric === m.value ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={clsx(
              "flex-1 rounded-full py-1.5 text-xs font-semibold",
              period === p.value ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50" : "text-gray-500"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <LineChartCard title={activeMetric.label} series={data?.series ?? []} unit={activeMetric.unit} color={activeMetric.color} loading={isLoading} />

      {weekly && (
        <Card title="This week at a glance">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Weight change" value={fmtSigned(weekly.weightChange as number | null, " lbs")} />
            <Metric label="Waist change" value={fmtSigned(weekly.waistChange as number | null, " in")} />
            <Metric label="Avg calories" value={fmtNum(weekly.avgCalories as number)} />
            <Metric label="Avg protein" value={fmtNum(weekly.avgProtein as number, "g")} />
            <Metric label="Avg steps" value={fmtNum(weekly.avgSteps as number | null)} />
            <Metric label="Workouts" value={String(weekly.exerciseSessions)} />
            <Metric label="Avg water" value={fmtNum(weekly.avgWaterOz as number | null, " oz")} />
            <Metric label="Avg sleep" value={fmtNum(weekly.avgSleepHours as number | null, " hrs")} />
            <Metric label="Habit completion" value={`${Math.round(weekly.habitCompletionPct as number)}%`} />
          </div>
        </Card>
      )}

      <Card title="Export your data">
        <div className="flex flex-wrap gap-2">
          <ExportButton path="/export/json" filename="wellness-export.json" label="Full JSON" />
          <ExportButton path="/export/csv/weightEntries" filename="weight.csv" label="Weight CSV" />
          <ExportButton path="/export/csv/bloodPressure" filename="blood-pressure.csv" label="BP CSV" />
          <ExportButton path="/export/pdf" filename="wellness-report.pdf" label="PDF report" />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function ExportButton({ path, filename, label }: { path: string; filename: string; label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await downloadFile(path, filename);
        } finally {
          setPending(false);
        }
      }}
      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
    >
      {pending ? "Preparing…" : label}
    </button>
  );
}

function fmtNum(v: number | null | undefined, unit = "") {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}${unit}`;
}

function fmtSigned(v: number | null | undefined, unit = "") {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}${unit}`;
}
