import { prisma } from "../../db/prisma";
import { daysAgo } from "../../utils/date";
import { summarizeTrend, average, calcGoalProgress } from "../metrics.service";
import { sumNutrition } from "../nutrition.service";
import { getActiveGoal } from "../goals.service";
import { habitCompletionRate } from "../habits.service";

// Builds one compact, structured JSON snapshot of the user's trends — this
// is what actually gets sent to the LLM. Deliberately summarized (averages,
// slopes, totals) rather than raw row dumps, so the coach reasons about
// patterns over time instead of reacting to one noisy data point, and so
// the prompt stays a reasonable size.
export async function buildCoachContext(userId: string, windowDays = 30) {
  const since = daysAgo(windowDays);

  const [user, goal, vitalRange, weights, measurements, meals, workouts, steps, water, sleep, bp, vitals, habits, preferences] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getActiveGoal(userId),
    prisma.vitalRange.findUnique({ where: { userId } }),
    prisma.weightEntry.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.meal.findMany({ where: { userId, eatenAt: { gte: since } }, include: { items: true }, orderBy: { eatenAt: "asc" } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: since } }, orderBy: { startedAt: "asc" } }),
    prisma.stepEntry.findMany({ where: { userId, date: { gte: since } } }),
    prisma.waterEntry.findMany({ where: { userId, recordedAt: { gte: since } } }),
    prisma.sleepEntry.findMany({ where: { userId, date: { gte: since } } }),
    prisma.bloodPressureReading.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.vitalsReading.findMany({ where: { userId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    prisma.habit.findMany({ where: { userId, active: true } }),
    prisma.userPreference.findMany({ where: { userId } }),
  ]);

  const weightSeries = weights.map((w) => ({ date: w.recordedAt, value: w.weight }));
  const weightTrend = summarizeTrend(weightSeries);
  const latestWeight = weightSeries[weightSeries.length - 1]?.value ?? null;
  const goalProgress = calcGoalProgress(goal?.startingWeight ?? null, latestWeight, goal?.goalWeight ?? null);

  const waistSeries = measurements.filter((m) => m.waist != null).map((m) => ({ date: m.recordedAt, value: m.waist as number }));

  const dailyNutrition = groupMealsByDay(meals);
  const nutritionAverages = {
    calories: average(dailyNutrition.map((d) => d.calories)),
    protein: average(dailyNutrition.map((d) => d.protein)),
    carbs: average(dailyNutrition.map((d) => d.carbs)),
    fat: average(dailyNutrition.map((d) => d.fat)),
    fiber: average(dailyNutrition.map((d) => d.fiber)),
    sodium: average(dailyNutrition.map((d) => d.sodium)),
    daysLogged: dailyNutrition.length,
    windowDays,
  };

  const habitStats = await Promise.all(
    habits.map(async (h) => ({ name: h.name, weeklyCompletionRate: await habitCompletionRate(userId, h.id, 7) }))
  );

  const preferencesByCategory: Record<string, unknown[]> = {};
  for (const p of preferences) {
    preferencesByCategory[p.category] = preferencesByCategory[p.category] ?? [];
    preferencesByCategory[p.category].push({ key: p.key, value: p.value });
  }

  return {
    profile: {
      unitSystem: user?.unitSystem,
      heightInches: user?.heightInches,
    },
    goal: goal
      ? {
          startingWeight: goal.startingWeight,
          goalWeight: goal.goalWeight,
          targetDate: goal.targetDate,
          calorieTarget: goal.calorieTarget,
          proteinTarget: goal.proteinTarget,
          waterTargetOz: goal.waterTargetOz,
          stepsTarget: goal.stepsTarget,
          workoutsPerWeek: goal.workoutsPerWeek,
        }
      : null,
    weight: { latest: latestWeight, trend: weightTrend, goalProgress },
    waist: { trend: summarizeTrend(waistSeries) },
    nutrition: { averages: nutritionAverages },
    activity: {
      workoutCount: workouts.length,
      totalExerciseMinutes: workouts.reduce((s, w) => s + (w.durationMinutes ?? 0), 0),
      types: Array.from(new Set(workouts.map((w) => w.type))),
      avgDailySteps: average(steps.map((s) => s.steps)),
    },
    lifestyle: {
      avgWaterOzPerDay: average(groupByDay(water, (w) => w.recordedAt, (w) => w.amountOz)),
      avgSleepHours: average(sleep.map((s) => s.hours)),
      habits: habitStats,
    },
    vitals: {
      targetRanges: vitalRange,
      bloodPressure: {
        avgSystolic: average(bp.map((b) => b.systolic)),
        avgDiastolic: average(bp.map((b) => b.diastolic)),
        readingCount: bp.length,
        trendSystolic: summarizeTrend(bp.map((b) => ({ date: b.recordedAt, value: b.systolic }))),
      },
      restingHeartRate: average(vitals.filter((v) => v.restingHeartRate != null).map((v) => v.restingHeartRate as number)),
    },
    preferences: preferencesByCategory,
  };
}

function groupMealsByDay(meals: { eatenAt: Date; items: { calories: number; protein: number; carbs: number; fat: number; fiber: number | null; sodium: number | null }[] }[]) {
  const byDay = new Map<string, ReturnType<typeof sumNutrition>>();
  for (const meal of meals) {
    const key = meal.eatenAt.toISOString().slice(0, 10);
    const existing = byDay.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 };
    const totals = sumNutrition(meal.items);
    byDay.set(key, {
      calories: existing.calories + totals.calories,
      protein: existing.protein + totals.protein,
      carbs: existing.carbs + totals.carbs,
      fat: existing.fat + totals.fat,
      fiber: existing.fiber + totals.fiber,
      sodium: existing.sodium + totals.sodium,
    });
  }
  return Array.from(byDay.values());
}

function groupByDay<T>(rows: T[], dateFn: (r: T) => Date, valueFn: (r: T) => number): number[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = dateFn(row).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + valueFn(row));
  }
  return Array.from(byDay.values());
}
