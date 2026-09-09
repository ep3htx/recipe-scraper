import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { getDashboard } from "../dashboard.service";
import { buildCoachContext } from "./context.service";
import { chatWithSafety, isAIEnabled } from "./AIService";
import { AI_DISCLAIMER } from "./safety";
import type { ChatMessage } from "./types";

function contextSystemPrompt(context: unknown): string {
  return [
    "You are the AI Coach inside a personal, self-hosted weight-loss and wellness dashboard.",
    "Use the JSON data below — which summarizes the user's trends over time — to give specific, personalized, practical guidance.",
    "Prefer concrete numbers from the data over generic advice. Keep responses concise and actionable. Use plain language, not clinical jargon.",
    "Data (JSON):",
    JSON.stringify(context),
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Today's summary — deterministic, works even with AI disabled.
// ---------------------------------------------------------------------------

export async function getTodaySummary(userId: string): Promise<string> {
  const dash = await getDashboard(userId);
  const cal = Math.round(dash.nutrition.totals.calories);
  const protein = Math.round(dash.nutrition.totals.protein);
  const steps = dash.steps.today;
  const water = Math.round(dash.water.totalOz);

  const parts = [`You've logged ${cal} calories, ${protein}g protein, ${steps.toLocaleString()} steps, and ${water} oz of water today.`];
  if (dash.weight.trend7d.slopePerDay != null && dash.weight.trend7d.slopePerDay < -0.02) {
    parts.push("Your 7-day weight trend is heading down.");
  } else if (dash.weight.trend7d.isPlateau) {
    parts.push("Your weight has been holding fairly steady the last week.");
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Today's recommendations — AI-generated when available, rule-based fallback
// otherwise, so the coach is never empty.
// ---------------------------------------------------------------------------

export async function getTodayRecommendations(userId: string): Promise<string[]> {
  const dash = await getDashboard(userId);

  if (!(await isAIEnabled())) {
    return ruleBasedRecommendations(dash);
  }

  const context = await buildCoachContext(userId, 30);
  const prompt: ChatMessage[] = [
    {
      role: "user",
      content:
        "Based on my data, give me 3 to 5 short, specific, actionable recommendations for the rest of today. " +
        "Return ONLY a JSON array of strings, no other text. Each string under 100 characters.",
    },
  ];
  try {
    const raw = await chatWithSafety(contextSystemPrompt({ ...context, today: dash }), prompt, { jsonMode: true, temperature: 0.5 });
    const parsed = safeParseStringArray(raw);
    if (parsed.length > 0) return parsed.slice(0, 5);
  } catch {
    // Fall through to rule-based suggestions if the provider errors out.
  }
  return ruleBasedRecommendations(dash);
}

function ruleBasedRecommendations(dash: Awaited<ReturnType<typeof getDashboard>>): string[] {
  const recs: string[] = [];
  const { nutrition, water, steps, workouts } = dash;
  if (nutrition.targets.protein && nutrition.totals.protein < nutrition.targets.protein * 0.6) {
    recs.push("Choose a higher-protein option for your next meal.");
  }
  if (water.targetOz && water.totalOz < water.targetOz * 0.6) {
    recs.push(`Drink about ${Math.round(water.targetOz - water.totalOz)} more oz of water today.`);
  }
  if (steps.target && steps.today < steps.target * 0.6) {
    recs.push("Take a 15-20 minute walk to build toward your step goal.");
  }
  if (workouts.length === 0) {
    recs.push("Fit in a short workout today, even 15-20 minutes counts.");
  }
  if (nutrition.targets.calories && nutrition.totals.calories > nutrition.targets.calories) {
    recs.push("You're over your calorie target today — keep the rest of today's meals light.");
  }
  if (recs.length === 0) {
    recs.push("You're on track — keep doing what you're doing today.");
  }
  return recs.slice(0, 5);
}

function safeParseStringArray(raw: string): string[] {
  try {
    const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    if (Array.isArray(parsed.recommendations)) return parsed.recommendations.filter((x: unknown) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Conversational coach ("Ask your coach")
// ---------------------------------------------------------------------------

export async function getOrCreateConversation(userId: string, conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) throw AppError.notFound("Conversation not found");
    return existing;
  }
  return prisma.aIConversation.create({ data: { userId } });
}

export async function sendCoachMessage(userId: string, conversationId: string | undefined, userMessage: string) {
  const conversation = await getOrCreateConversation(userId, conversationId);
  const history = await prisma.aIMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "user", content: userMessage } });

  const context = await buildCoachContext(userId, 60);
  const messages: ChatMessage[] = [
    ...history.map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })),
    { role: "user", content: userMessage },
  ];

  const reply = await chatWithSafety(contextSystemPrompt(context), messages, { temperature: 0.5 });
  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });
  await prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  return { conversationId: conversation.id, reply, disclaimer: AI_DISCLAIMER };
}

// ---------------------------------------------------------------------------
// Weekly / monthly coach — narrative interpretation on top of the raw
// weekly-report numbers, cached as an AIInsight.
// ---------------------------------------------------------------------------

export async function generatePeriodInsight(userId: string, type: "weekly" | "monthly") {
  const windowDays = type === "weekly" ? 7 : 30;
  const periodStart = new Date(Date.now() - windowDays * 86_400_000);
  const periodEnd = new Date();
  const context = await buildCoachContext(userId, windowDays);

  let content: { summary: string; wins: string[]; improvements: string[]; focus: string };

  if (await isAIEnabled()) {
    const prompt: ChatMessage[] = [
      {
        role: "user",
        content:
          `Write a ${type} progress review from the data below. Return ONLY JSON with this exact shape: ` +
          `{"summary": string, "wins": string[], "improvements": string[], "focus": string}. ` +
          "summary: 2-3 plain-language sentences on overall progress. wins: up to 3 short things going well. " +
          "improvements: up to 3 short areas to work on. focus: ONE specific thing to focus on next period. " +
          "Avoid overwhelming the user — be concise and avoid speculation presented as fact.",
      },
    ];
    try {
      const raw = await chatWithSafety(contextSystemPrompt(context), prompt, { jsonMode: true, temperature: 0.5 });
      content = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      content = fallbackInsight(context);
    }
  } else {
    content = fallbackInsight(context);
  }

  const insight = await prisma.aIInsight.create({
    data: { userId, type, periodStart, periodEnd, content: content as never },
  });
  return insight;
}

function fallbackInsight(context: Awaited<ReturnType<typeof buildCoachContext>>) {
  const wins: string[] = [];
  const improvements: string[] = [];
  if (context.weight.trend.slopePerDay != null && context.weight.trend.slopePerDay < 0) wins.push("Weight trend is moving down.");
  if (context.lifestyle.avgWaterOzPerDay && context.goal?.waterTargetOz && context.lifestyle.avgWaterOzPerDay >= context.goal.waterTargetOz) {
    wins.push("Hitting your water goal consistently.");
  }
  if (context.activity.avgDailySteps && context.goal?.stepsTarget && context.activity.avgDailySteps < context.goal.stepsTarget) {
    improvements.push("Average daily steps are below your goal.");
  }
  if (context.nutrition.averages.protein && context.goal?.proteinTarget && context.nutrition.averages.protein < context.goal.proteinTarget) {
    improvements.push("Protein intake is running below your target most days.");
  }
  return {
    summary: "Here's a data-based summary of your recent trends. Enable an AI provider for a more detailed, personalized narrative.",
    wins: wins.length ? wins : ["Keep logging consistently — that's the foundation everything else builds on."],
    improvements: improvements.length ? improvements : ["No major gaps detected in the available data."],
    focus: improvements[0] ?? "Keep consistent with logging and your current routine.",
  };
}
