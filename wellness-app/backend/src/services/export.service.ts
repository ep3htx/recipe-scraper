import PDFDocument from "pdfkit";
import { prisma } from "../db/prisma";
import { buildWeeklyReport } from "./progress.service";
import { getActiveGoal } from "./goals.service";

export async function collectUserData(userId: string) {
  const [weightEntries, bodyMeasurements, bloodPressure, vitals, meals, workoutSessions, goals, habitEntries, waterEntries, sleepEntries, stepEntries] =
    await Promise.all([
      prisma.weightEntry.findMany({ where: { userId }, orderBy: { recordedAt: "asc" } }),
      prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { recordedAt: "asc" } }),
      prisma.bloodPressureReading.findMany({ where: { userId }, orderBy: { recordedAt: "asc" } }),
      prisma.vitalsReading.findMany({ where: { userId }, orderBy: { recordedAt: "asc" } }),
      prisma.meal.findMany({ where: { userId }, include: { items: true }, orderBy: { eatenAt: "asc" } }),
      prisma.workoutSession.findMany({ where: { userId }, include: { sets: true }, orderBy: { startedAt: "asc" } }),
      prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.habitEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.waterEntry.findMany({ where: { userId }, orderBy: { recordedAt: "asc" } }),
      prisma.sleepEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.stepEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    ]);
  return { weightEntries, bodyMeasurements, bloodPressure, vitals, meals, workoutSessions, goals, habitEntries, waterEntries, sleepEntries, stepEntries };
}

// Small, dependency-free CSV writer — good enough for flat health-record rows.
export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function generateHealthReportPDF(userId: string): Promise<Buffer> {
  const [user, goal, weekly, latestWeight] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getActiveGoal(userId),
    buildWeeklyReport(userId),
    prisma.weightEntry.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
  ]);

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text("Personal Wellness Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#666").text(`Generated ${new Date().toLocaleString()} for ${user?.name ?? user?.email ?? "user"}`, { align: "center" });
  doc.moveDown(2);

  doc.fillColor("#000").fontSize(14).text("Weight & Goal");
  doc.fontSize(11).text(`Current weight: ${latestWeight?.weight ?? "—"} lbs`);
  doc.text(`Starting weight: ${goal?.startingWeight ?? "—"} lbs`);
  doc.text(`Goal weight: ${goal?.goalWeight ?? "—"} lbs`);
  doc.moveDown();

  doc.fontSize(14).text("Last 7 Days");
  doc.fontSize(11);
  doc.text(`Weight change: ${weekly.weightChange != null ? weekly.weightChange.toFixed(1) + " lbs" : "—"}`);
  doc.text(`Waist change: ${weekly.waistChange != null ? weekly.waistChange.toFixed(1) + " in" : "—"}`);
  doc.text(`Average calories: ${weekly.avgCalories.toFixed(0)}`);
  doc.text(`Average protein: ${weekly.avgProtein.toFixed(0)} g`);
  doc.text(`Average steps: ${weekly.avgSteps != null ? weekly.avgSteps.toFixed(0) : "—"}`);
  doc.text(`Exercise sessions: ${weekly.exerciseSessions} (${weekly.exerciseMinutes} min)`);
  doc.text(`Average water: ${weekly.avgWaterOz != null ? weekly.avgWaterOz.toFixed(0) + " oz" : "—"}`);
  doc.text(`Average sleep: ${weekly.avgSleepHours != null ? weekly.avgSleepHours.toFixed(1) + " hrs" : "—"}`);
  if (weekly.bloodPressureTrend) {
    doc.text(
      `Blood pressure avg: ${weekly.bloodPressureTrend.avgSystolic?.toFixed(0)}/${weekly.bloodPressureTrend.avgDiastolic?.toFixed(0)} (${weekly.bloodPressureTrend.readingCount} readings)`
    );
  }
  doc.text(`Habit completion: ${weekly.habitCompletionPct.toFixed(0)}%`);

  doc.moveDown(2);
  doc.fontSize(9).fillColor("#888").text(
    "This report is generated from self-reported data for personal tracking purposes only. It is not a medical document and does not constitute medical advice, diagnosis, or treatment. Consult a healthcare professional for medical concerns.",
    { align: "left" }
  );

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
