import { prisma } from "../db/prisma";
import { startOfDay, endOfDay, daysAgo, toDateOnly, todayDateOnly } from "../utils/date";
import { calcBMI, calcGoalProgress, summarizeTrend } from "./metrics.service";
import { sumNutrition } from "./nutrition.service";
import { getActiveGoal } from "./goals.service";
import { calcStreak } from "./habits.service";

// Everything the "Good Morning" home screen needs in one round trip:
// where the user stands, whether today is on track, and what's left to do.
export async function getDashboard(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    user,
    goal,
    recentWeights,
    latestMeasurement,
    latestBP,
    latestVitals,
    todaySteps,
    todayMeals,
    todayWater,
    todaySleep,
    todayWorkouts,
    habits,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getActiveGoal(userId),
    prisma.weightEntry.findMany({ where: { userId, recordedAt: { gte: daysAgo(14) } }, orderBy: { recordedAt: "desc" } }),
    prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
    prisma.bloodPressureReading.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
    prisma.vitalsReading.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
    prisma.stepEntry.findUnique({ where: { userId_date: { userId, date: todayDateOnly() } } }),
    prisma.meal.findMany({ where: { userId, eatenAt: { gte: todayStart, lte: todayEnd } }, include: { items: true } }),
    prisma.waterEntry.findMany({ where: { userId, recordedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.sleepEntry.findUnique({ where: { userId_date: { userId, date: new Date(todayDateOnly().getTime() - 86_400_000) } } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.habit.findMany({ where: { userId, active: true } }),
  ]);

  const latestWeight = recentWeights[0]?.weight ?? null;
  const goalProgress = calcGoalProgress(goal?.startingWeight ?? null, latestWeight, goal?.goalWeight ?? null);
  const bmi = latestWeight != null && user?.heightInches ? calcBMI(latestWeight, user.heightInches) : null;

  const weightTrend7d = summarizeTrend(
    recentWeights.filter((w) => w.recordedAt.getTime() >= daysAgo(7).getTime()).map((w) => ({ date: w.recordedAt, value: w.weight }))
  );

  const nutritionTotals = sumNutrition(todayMeals.flatMap((m) => m.items));
  const waterOz = todayWater.reduce((sum, w) => sum + w.amountOz, 0);

  const habitsWithStatus = await Promise.all(
    habits.map(async (h) => {
      const entry = await prisma.habitEntry.findUnique({ where: { habitId_date: { habitId: h.id, date: todayDateOnly() } } });
      return { id: h.id, name: h.name, icon: h.icon, completed: entry?.completed ?? false, streak: await calcStreak(userId, h.id) };
    })
  );

  const priorities: { label: string; done: boolean }[] = [
    { label: "Log breakfast", done: todayMeals.some((m) => m.mealType === "breakfast") },
    { label: "Log lunch", done: todayMeals.some((m) => m.mealType === "lunch") },
    { label: "Log dinner", done: todayMeals.some((m) => m.mealType === "dinner") },
    {
      label: goal?.waterTargetOz ? `Drink ${Math.max(0, goal.waterTargetOz - waterOz).toFixed(0)} oz more water` : "Log water intake",
      done: goal?.waterTargetOz ? waterOz >= goal.waterTargetOz : waterOz > 0,
    },
    { label: "Complete a workout", done: todayWorkouts.length > 0 },
    ...habitsWithStatus
      .filter((h) => !["Log all meals", "Hit step goal"].includes(h.name))
      .map((h) => ({ label: h.name, done: h.completed })),
  ];

  return {
    greeting: greetingForHour(now.getHours()),
    weight: {
      current: latestWeight,
      starting: goal?.startingWeight ?? null,
      goal: goal?.goalWeight ?? null,
      bmi,
      ...goalProgress,
      trend7d: weightTrend7d,
    },
    bodyMeasurement: latestMeasurement,
    bloodPressure: latestBP,
    vitals: latestVitals,
    steps: { today: todaySteps?.steps ?? 0, target: goal?.stepsTarget ?? null },
    nutrition: {
      totals: nutritionTotals,
      targets: {
        calories: goal?.calorieTarget ?? null,
        protein: goal?.proteinTarget ?? null,
        carbs: goal?.carbTarget ?? null,
        fat: goal?.fatTarget ?? null,
        fiber: goal?.fiberTarget ?? null,
        sodium: goal?.sodiumTarget ?? null,
      },
      meals: todayMeals,
    },
    water: { totalOz: waterOz, targetOz: goal?.waterTargetOz ?? null },
    sleep: todaySleep ? { hours: todaySleep.hours, quality: todaySleep.quality } : null,
    workouts: todayWorkouts,
    habits: habitsWithStatus,
    priorities,
  };
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "GOOD NIGHT";
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}
