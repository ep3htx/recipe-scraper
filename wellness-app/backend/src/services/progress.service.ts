import { prisma } from "../db/prisma";
import { average } from "./metrics.service";

export const PERIODS = ["7d", "30d", "90d", "1y", "all"] as const;
export type Period = (typeof PERIODS)[number];

export function periodStart(period: Period): Date | undefined {
  const days: Record<Exclude<Period, "all">, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  if (period === "all") return undefined;
  return new Date(Date.now() - days[period] * 86_400_000);
}

export const CHART_METRICS = [
  "weight",
  "weight7dAvg",
  "waist",
  "bodyFat",
  "bloodPressure",
  "heartRate",
  "calories",
  "protein",
  "steps",
  "exerciseMinutes",
  "water",
  "sleep",
] as const;
export type ChartMetric = (typeof CHART_METRICS)[number];

export async function getChartSeries(userId: string, metric: ChartMetric, period: Period) {
  const gte = periodStart(period);
  const where = { userId, ...(gte ? { recordedAt: { gte } } : {}) };
  const whereDate = { userId, ...(gte ? { date: { gte } } : {}) };
  const whereStarted = { userId, ...(gte ? { startedAt: { gte } } : {}) };

  switch (metric) {
    case "weight":
    case "weight7dAvg": {
      const rows = await prisma.weightEntry.findMany({ where, orderBy: { recordedAt: "asc" } });
      const points = rows.map((r) => ({ date: r.recordedAt, value: r.weight }));
      if (metric === "weight") return points;
      return sevenDayAverage(points);
    }
    case "waist": {
      const rows = await prisma.bodyMeasurement.findMany({ where, orderBy: { recordedAt: "asc" } });
      return rows.filter((r) => r.waist != null).map((r) => ({ date: r.recordedAt, value: r.waist as number }));
    }
    case "bodyFat": {
      const rows = await prisma.weightEntry.findMany({ where, orderBy: { recordedAt: "asc" } });
      return rows.filter((r) => r.bodyFatPct != null).map((r) => ({ date: r.recordedAt, value: r.bodyFatPct as number }));
    }
    case "bloodPressure": {
      const rows = await prisma.bloodPressureReading.findMany({ where, orderBy: { recordedAt: "asc" } });
      return rows.map((r) => ({ date: r.recordedAt, systolic: r.systolic, diastolic: r.diastolic, pulse: r.pulse }));
    }
    case "heartRate": {
      const rows = await prisma.vitalsReading.findMany({ where, orderBy: { recordedAt: "asc" } });
      return rows.filter((r) => r.restingHeartRate != null).map((r) => ({ date: r.recordedAt, value: r.restingHeartRate as number }));
    }
    case "calories":
    case "protein": {
      const meals = await prisma.meal.findMany({
        where: { userId, ...(gte ? { eatenAt: { gte } } : {}) },
        include: { items: true },
      });
      return groupDailyTotals(meals, metric);
    }
    case "steps": {
      const rows = await prisma.stepEntry.findMany({ where: whereDate, orderBy: { date: "asc" } });
      return rows.map((r) => ({ date: r.date, value: r.steps }));
    }
    case "exerciseMinutes": {
      const rows = await prisma.workoutSession.findMany({ where: whereStarted, orderBy: { startedAt: "asc" } });
      return rows.map((r) => ({ date: r.startedAt, value: r.durationMinutes ?? 0 }));
    }
    case "water": {
      const rows = await prisma.waterEntry.findMany({ where, orderBy: { recordedAt: "asc" } });
      return groupWaterByDay(rows);
    }
    case "sleep": {
      const rows = await prisma.sleepEntry.findMany({ where: whereDate, orderBy: { date: "asc" } });
      return rows.map((r) => ({ date: r.date, value: r.hours }));
    }
    default:
      return [];
  }
}

function sevenDayAverage(points: { date: Date; value: number }[]) {
  return points.map((p, i) => {
    const windowStart = p.date.getTime() - 7 * 86_400_000;
    const window = points.slice(0, i + 1).filter((q) => q.date.getTime() > windowStart);
    return { date: p.date, value: average(window.map((q) => q.value)) ?? p.value };
  });
}

function groupDailyTotals(meals: { eatenAt: Date; items: { calories: number; protein: number }[] }[], metric: "calories" | "protein") {
  const byDay = new Map<string, number>();
  for (const meal of meals) {
    const key = meal.eatenAt.toISOString().slice(0, 10);
    const value = meal.items.reduce((sum, i) => sum + (metric === "calories" ? i.calories : i.protein), 0);
    byDay.set(key, (byDay.get(key) ?? 0) + value);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date: new Date(date), value }));
}

function groupWaterByDay(rows: { recordedAt: Date; amountOz: number }[]) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = row.recordedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + row.amountOz);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date: new Date(date), value }));
}

// ---------------------------------------------------------------------------
// Weekly report (raw numbers only — AI narrative lives in the coach layer)
// ---------------------------------------------------------------------------

export async function buildWeeklyReport(userId: string) {
  const since = new Date(Date.now() - 7 * 86_400_000);

  const [weights, measurements, meals, steps, workouts, water, sleep, bp, habits] = await Promise.all([
    prisma.weightEntry.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.meal.findMany({ where: { userId, eatenAt: { gte: since } }, include: { items: true } }),
    prisma.stepEntry.findMany({ where: { userId, date: { gte: since } } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: since } } }),
    prisma.waterEntry.findMany({ where: { userId, recordedAt: { gte: since } } }),
    prisma.sleepEntry.findMany({ where: { userId, date: { gte: since } } }),
    prisma.bloodPressureReading.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.habit.findMany({ where: { userId, active: true } }),
  ]);

  const weightChange = weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : null;
  const waistValues = measurements.filter((m) => m.waist != null).map((m) => m.waist as number);
  const waistChange = waistValues.length >= 2 ? waistValues[waistValues.length - 1] - waistValues[0] : null;

  const nutritionTotals = meals.reduce(
    (acc, m) => {
      for (const item of m.items) {
        acc.calories += item.calories;
        acc.protein += item.protein;
      }
      return acc;
    },
    { calories: 0, protein: 0 }
  );
  const daysLogged = new Set(meals.map((m) => m.eatenAt.toISOString().slice(0, 10))).size || 1;

  let habitCompletionPct = 0;
  if (habits.length > 0) {
    const entries = await prisma.habitEntry.count({ where: { userId, date: { gte: since }, completed: true } });
    habitCompletionPct = Math.min(100, (entries / (habits.length * 7)) * 100);
  }

  return {
    periodStart: since,
    periodEnd: new Date(),
    weightChange,
    waistChange,
    avgCalories: nutritionTotals.calories / daysLogged,
    avgProtein: nutritionTotals.protein / daysLogged,
    avgSteps: average(steps.map((s) => s.steps)),
    exerciseSessions: workouts.length,
    exerciseMinutes: workouts.reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0),
    avgWaterOz: waterDailyAverage(water),
    avgSleepHours: average(sleep.map((s) => s.hours)),
    bloodPressureTrend:
      bp.length > 0
        ? {
            avgSystolic: average(bp.map((b) => b.systolic)),
            avgDiastolic: average(bp.map((b) => b.diastolic)),
            readingCount: bp.length,
          }
        : null,
    habitCompletionPct,
  };
}

function waterDailyAverage(rows: { recordedAt: Date; amountOz: number }[]) {
  const byDay = groupWaterByDay(rows);
  return average(byDay.map((d) => d.value));
}
