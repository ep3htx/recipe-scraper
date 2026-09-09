import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { daysAgo } from "../../utils/date";
import { chatWithSafety, isAIEnabled } from "./AIService";
import type { ChatMessage } from "./types";

export interface WorkoutRequest {
  equipment?: string[];
  minutesAvailable?: number;
  focus?: string; // e.g. "full body", "cardio", "legs"
}

export interface GeneratedWorkout {
  type: string;
  title: string;
  durationMinutes: number;
  exercises: { name: string; sets?: number; reps?: number; resistance?: string; notes?: string }[];
}

export async function generateWorkout(userId: string, req: WorkoutRequest): Promise<GeneratedWorkout> {
  if (!(await isAIEnabled())) {
    throw AppError.badRequest("AI workout generation requires an AI provider.", "AI_DISABLED");
  }

  const [goal, recentWorkouts] = await Promise.all([
    prisma.goal.findFirst({ where: { userId, isActive: true } }),
    prisma.workoutSession.findMany({ where: { userId, startedAt: { gte: daysAgo(14) } }, orderBy: { startedAt: "desc" }, take: 10 }),
  ]);

  const prompt: ChatMessage[] = [
    {
      role: "user",
      content: [
        `Available equipment: ${JSON.stringify(req.equipment ?? ["bodyweight only"])}`,
        `Time available: ${req.minutesAvailable ?? 30} minutes`,
        req.focus ? `Focus area: ${req.focus}` : "",
        `Workouts/week goal: ${goal?.workoutsPerWeek ?? "not set"}`,
        `Recent workout types (last 14 days): ${JSON.stringify(recentWorkouts.map((w) => w.type))}`,
        "Design one workout for today. Return ONLY JSON:",
        '{"type": string, "title": string, "durationMinutes": number, "exercises": [{"name": string, "sets": number, "reps": number, "resistance": string, "notes": string}]}',
        'type must be one of: walking, running, cycling, strength, resistance_bands, kettlebells, bodyweight, sports, mobility.',
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const raw = await chatWithSafety(
    "You are a fitness coach inside a personal wellness app, generating a single workout suited to the equipment and time available. Keep it safe and realistic. Respond with strict JSON only.",
    prompt,
    { jsonMode: true, temperature: 0.6 }
  );

  try {
    return JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw AppError.badRequest("Couldn't parse the generated workout. Try again.", "AI_PARSE_ERROR");
  }
}
