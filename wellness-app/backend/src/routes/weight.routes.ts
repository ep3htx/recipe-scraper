import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { summarizeTrend, movingAverage, calcGoalProgress } from "../services/metrics.service";
import { getActiveGoal } from "../services/goals.service";

const router = Router();
router.use(requireAuth);

const weightEntrySchema = z.object({
  weight: z.number().positive(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  recordedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(2000).optional(),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.weightEntry.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("recordedAt", q) },
      orderBy: { recordedAt: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const since = new Date(Date.now() - 90 * 86_400_000);
    const entries = await prisma.weightEntry.findMany({
      where: { userId, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    });
    const series = entries.map((e) => ({ date: e.recordedAt, value: e.weight }));
    const trend90d = summarizeTrend(series);
    const trend7d = summarizeTrend(series.filter((p) => p.date.getTime() >= Date.now() - 7 * 86_400_000));
    const sevenDayAvg = movingAverage(series, 7);

    const goal = await getActiveGoal(userId);
    const latest = entries[entries.length - 1]?.weight ?? null;
    const progress = calcGoalProgress(goal?.startingWeight ?? null, latest, goal?.goalWeight ?? null);

    res.json({
      latest,
      trend7d,
      trend90d,
      sevenDayAverageSeries: sevenDayAvg,
      goalProgress: progress,
    });
  })
);

router.post(
  "/",
  validateBody(weightEntrySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.weightEntry.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(entry);
  })
);

router.put(
  "/:id",
  validateBody(weightEntrySchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.weightEntry.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Weight entry not found");
    const entry = await prisma.weightEntry.update({ where: { id: existing.id }, data: req.body });
    res.json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.weightEntry.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Weight entry not found");
    await prisma.weightEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
