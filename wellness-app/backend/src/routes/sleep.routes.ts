import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { toDateOnly } from "../utils/date";

const router = Router();
router.use(requireAuth);

const sleepSchema = z.object({
  date: z.coerce.date(),
  hours: z.number().min(0).max(24),
  quality: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.sleepEntry.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("date", q) },
      orderBy: { date: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.put(
  "/",
  validateBody(sleepSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { date, ...rest } = req.body;
    const day = toDateOnly(date);
    const entry = await prisma.sleepEntry.upsert({
      where: { userId_date: { userId: req.userId!, date: day } },
      update: rest,
      create: { ...rest, date: day, userId: req.userId! },
    });
    res.json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.sleepEntry.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Sleep entry not found");
    await prisma.sleepEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
