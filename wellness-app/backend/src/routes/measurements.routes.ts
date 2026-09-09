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

const measurementSchema = z.object({
  waist: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  neck: z.number().positive().optional(),
  arm: z.number().positive().optional(),
  thigh: z.number().positive().optional(),
  recordedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(2000).optional(),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.bodyMeasurement.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("recordedAt", q) },
      orderBy: { recordedAt: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.post(
  "/",
  validateBody(measurementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.bodyMeasurement.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(entry);
  })
);

router.put(
  "/:id",
  validateBody(measurementSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.bodyMeasurement.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Measurement not found");
    const entry = await prisma.bodyMeasurement.update({ where: { id: existing.id }, data: req.body });
    res.json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.bodyMeasurement.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Measurement not found");
    await prisma.bodyMeasurement.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
