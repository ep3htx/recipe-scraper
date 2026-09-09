import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

const router = Router();
router.use(requireAuth);

const CATEGORIES = [
  "walking",
  "running",
  "cycling",
  "strength",
  "resistance_bands",
  "kettlebells",
  "bodyweight",
  "sports",
  "mobility",
] as const;

const setSchema = z.object({
  exerciseName: z.string().min(1).max(150),
  exerciseId: z.string().uuid().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  resistance: z.string().max(100).optional(),
  order: z.number().int().min(0).default(0),
});

const sessionSchema = z.object({
  type: z.enum(CATEGORIES),
  startedAt: z.coerce.date().default(() => new Date()),
  durationMinutes: z.number().int().positive().optional(),
  distanceMiles: z.number().min(0).optional(),
  caloriesBurned: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(setSchema).default([]),
});

router.get(
  "/categories",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(CATEGORIES);
  })
);

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("startedAt", q) },
      orderBy: { startedAt: "desc" },
      take: q.limit,
      include: { sets: true },
    });
    res.json(sessions);
  })
);

router.post(
  "/",
  validateBody(sessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { sets, ...sessionData } = req.body;
    const session = await prisma.workoutSession.create({
      data: { ...sessionData, userId: req.userId!, sets: { create: sets } },
      include: { sets: true },
    });
    res.status(201).json(session);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.workoutSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Workout not found");
    await prisma.workoutSession.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
