import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { isAIEnabled } from "../services/ai/AIService";
import { getTodaySummary, getTodayRecommendations, sendCoachMessage, generatePeriodInsight } from "../services/ai/coach.service";
import { generateMealPlan, suggestSubstitutes, suggestFromPantry } from "../services/ai/mealPlanner.service";
import { generateWorkout } from "../services/ai/workout.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/status",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ provider: env.AI_PROVIDER, model: env.AI_MODEL, enabled: await isAIEnabled() });
  })
);

// ---- Coach home ----

router.get(
  "/coach/today",
  asyncHandler(async (req: Request, res: Response) => {
    const [summary, recommendations] = await Promise.all([getTodaySummary(req.userId!), getTodayRecommendations(req.userId!)]);
    res.json({ summary, recommendations });
  })
);

// ---- Conversational coach ----

router.get(
  "/conversations",
  asyncHandler(async (req: Request, res: Response) => {
    const conversations = await prisma.aIConversation.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    res.json(conversations);
  })
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) throw AppError.notFound("Conversation not found");
    res.json(conversation);
  })
);

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

router.post(
  "/chat",
  validateBody(chatSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendCoachMessage(req.userId!, req.body.conversationId, req.body.message);
    res.json(result);
  })
);

// ---- Insights (daily/weekly/monthly interpretation) ----

router.get(
  "/insights",
  asyncHandler(async (req: Request, res: Response) => {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const insights = await prisma.aIInsight.findMany({
      where: { userId: req.userId!, ...(type ? { type } : {}) },
      orderBy: { periodStart: "desc" },
      take: 20,
    });
    res.json(insights);
  })
);

router.post(
  "/insights/weekly",
  asyncHandler(async (req: Request, res: Response) => {
    const insight = await generatePeriodInsight(req.userId!, "weekly");
    res.status(201).json(insight);
  })
);

router.post(
  "/insights/monthly",
  asyncHandler(async (req: Request, res: Response) => {
    const insight = await generatePeriodInsight(req.userId!, "monthly");
    res.status(201).json(insight);
  })
);

// ---- Meal planner ----

const planRequestSchema = z.object({
  days: z.number().int().min(1).max(14).optional(),
  mealsPerDay: z.number().int().min(1).max(6).optional(),
  snacksPerDay: z.number().int().min(0).max(4).optional(),
  cookingMinutesMax: z.number().int().positive().optional(),
  budget: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().max(1000).optional(),
});

router.post(
  "/meal-plan",
  validateBody(planRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await generateMealPlan(req.userId!, req.body);
    res.status(201).json(plan);
  })
);

const substituteSchema = z.object({
  title: z.string().min(1).max(200),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
});

router.post(
  "/meal-substitutes",
  validateBody(substituteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const alternatives = await suggestSubstitutes(req.userId!, req.body);
    res.json({ alternatives });
  })
);

router.post(
  "/pantry-suggestions",
  validateBody(z.object({ notes: z.string().max(1000).optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const suggestions = await suggestFromPantry(req.userId!, req.body.notes);
    res.json({ suggestions });
  })
);

// ---- Workout generation ----

const workoutRequestSchema = z.object({
  equipment: z.array(z.string()).optional(),
  minutesAvailable: z.number().int().positive().optional(),
  focus: z.string().max(100).optional(),
});

router.post(
  "/workout",
  validateBody(workoutRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const workout = await generateWorkout(req.userId!, req.body);
    res.json(workout);
  })
);

export default router;
