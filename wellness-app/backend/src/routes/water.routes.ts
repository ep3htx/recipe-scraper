import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { todayLocalStart, todayLocalEnd } from "../utils/date";

const router = Router();
router.use(requireAuth);

const waterSchema = z.object({
  amountOz: z.number().positive(),
  recordedAt: z.coerce.date().default(() => new Date()),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.waterEntry.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("recordedAt", q) },
      orderBy: { recordedAt: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.get(
  "/today",
  asyncHandler(async (req: Request, res: Response) => {
    const entries = await prisma.waterEntry.findMany({
      where: { userId: req.userId!, recordedAt: { gte: todayLocalStart(), lte: todayLocalEnd() } },
    });
    const totalOz = entries.reduce((sum, e) => sum + e.amountOz, 0);
    res.json({ totalOz, entries });
  })
);

router.post(
  "/",
  validateBody(waterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.waterEntry.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.waterEntry.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Water entry not found");
    await prisma.waterEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
