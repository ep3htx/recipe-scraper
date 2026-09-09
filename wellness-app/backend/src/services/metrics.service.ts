// Pure health-metric calculations, kept free of DB/HTTP concerns so they're
// easy to unit test and reuse from both REST routes and the AI coach layer.

export function calcBMI(weightLbs: number, heightInches: number): number {
  return Number((((weightLbs / heightInches) / heightInches) * 703).toFixed(1));
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Simple linear-regression slope (units per day) — used to describe a trend
// ("losing ~0.4 lb/week") without reacting to any single noisy data point.
export function linearTrendSlope(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

export interface TrendSeriesPoint {
  date: Date;
  value: number;
}

export interface TrendSummary {
  latest: number | null;
  average: number | null;
  changeAbsolute: number | null;
  changePct: number | null;
  slopePerDay: number | null;
  isPlateau: boolean;
}

// Summarizes a time series for coaching / dashboard use: latest value,
// period average, net change, and a rough trend slope. "Plateau" means the
// slope over the window is small relative to typical day-to-day noise.
export function summarizeTrend(series: TrendSeriesPoint[], plateauThresholdPerDay = 0.05): TrendSummary {
  if (series.length === 0) {
    return { latest: null, average: null, changeAbsolute: null, changePct: null, slopePerDay: null, isPlateau: false };
  }
  const sorted = [...series].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1].value;
  const first = sorted[0].value;
  const avg = average(sorted.map((p) => p.value));
  const origin = sorted[0].date.getTime();
  const points = sorted.map((p) => ({ x: (p.date.getTime() - origin) / 86_400_000, y: p.value }));
  const slope = linearTrendSlope(points);
  const changeAbsolute = latest - first;
  const changePct = first !== 0 ? (changeAbsolute / Math.abs(first)) * 100 : null;
  return {
    latest,
    average: avg,
    changeAbsolute,
    changePct,
    slopePerDay: slope,
    isPlateau: slope !== null && Math.abs(slope) < plateauThresholdPerDay,
  };
}

export function movingAverage(series: TrendSeriesPoint[], windowDays: number): TrendSeriesPoint[] {
  const sorted = [...series].sort((a, b) => a.date.getTime() - b.date.getTime());
  return sorted.map((point, i) => {
    const windowStart = point.date.getTime() - windowDays * 86_400_000;
    const windowPoints = sorted.slice(0, i + 1).filter((p) => p.date.getTime() > windowStart);
    return { date: point.date, value: average(windowPoints.map((p) => p.value)) ?? point.value };
  });
}

export interface GoalProgress {
  startingWeight: number | null;
  currentWeight: number | null;
  goalWeight: number | null;
  poundsLost: number | null;
  poundsRemaining: number | null;
  progressPct: number | null;
}

export function calcGoalProgress(startingWeight: number | null, currentWeight: number | null, goalWeight: number | null): GoalProgress {
  if (startingWeight == null || currentWeight == null || goalWeight == null) {
    return { startingWeight, currentWeight, goalWeight, poundsLost: null, poundsRemaining: null, progressPct: null };
  }
  const poundsLost = startingWeight - currentWeight;
  const poundsRemaining = currentWeight - goalWeight;
  const totalToLose = startingWeight - goalWeight;
  const progressPct = totalToLose !== 0 ? Math.max(0, Math.min(100, (poundsLost / totalToLose) * 100)) : 100;
  return { startingWeight, currentWeight, goalWeight, poundsLost, poundsRemaining, progressPct };
}
