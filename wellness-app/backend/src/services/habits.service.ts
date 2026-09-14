import { prisma } from "../db/prisma";
import { toDateOnly, todayDateOnly } from "../utils/date";

// Longest current run of consecutive completed days, walking backward from
// today (or yesterday, so a habit already done today doesn't get penalized
// mid-day before it's logged).
export async function calcStreak(userId: string, habitId: string): Promise<number> {
  const entries = await prisma.habitEntry.findMany({
    where: { userId, habitId, completed: true },
    orderBy: { date: "desc" },
    take: 400,
  });
  if (entries.length === 0) return 0;

  const completedDates = new Set(entries.map((e) => toDateOnly(e.date).getTime()));
  let streak = 0;
  const cursor = todayDateOnly();

  // Allow the streak to still count if today just hasn't been logged yet.
  if (!completedDates.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function habitCompletionRate(userId: string, habitId: string, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000);
  const count = await prisma.habitEntry.count({
    where: { userId, habitId, completed: true, date: { gte: since } },
  });
  return Math.min(1, count / days);
}
