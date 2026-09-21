import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { startOfDay, endOfDay } from "../utils/date";
import { normalizeBarcode } from "../services/barcode.service";

const router = Router();
router.use(requireAuth);

const supplementSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).optional(),
  barcode: z.string().max(32).transform((v) => normalizeBarcode(v)).optional(),
  servingSize: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/supplements - the user's supplement library, each with how many
// servings have been taken today.
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const [supplements, todays] = await Promise.all([
      prisma.supplement.findMany({ where: { userId: req.userId! }, orderBy: { name: "asc" } }),
      prisma.supplementLog.groupBy({
        by: ["supplementId"],
        where: { userId: req.userId!, takenAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        _sum: { quantity: true },
      }),
    ]);
    const takenBySupplement = new Map(todays.map((t) => [t.supplementId, t._sum.quantity ?? 0]));
    res.json(supplements.map((s) => ({ ...s, takenToday: takenBySupplement.get(s.id) ?? 0 })));
  })
);

router.post(
  "/",
  validateBody(supplementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const supplement = await prisma.supplement.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(supplement);
  })
);

router.put(
  "/:id",
  validateBody(supplementSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.supplement.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Supplement not found");
    res.json(await prisma.supplement.update({ where: { id: existing.id }, data: req.body }));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.supplement.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Supplement not found");
    await prisma.supplement.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

const logSchema = z.object({
  quantity: z.number().positive().max(100).default(1),
  takenAt: z.coerce.date().default(() => new Date()),
});

// POST /api/supplements/:id/logs - record a dose.
router.post(
  "/:id/logs",
  validateBody(logSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.supplement.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Supplement not found");
    const log = await prisma.supplementLog.create({
      data: { supplementId: existing.id, userId: req.userId!, quantity: req.body.quantity, takenAt: req.body.takenAt },
    });
    res.status(201).json(log);
  })
);

// DELETE /api/supplements/:id/logs/latest - undo the most recent dose logged today.
router.delete(
  "/:id/logs/latest",
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const latest = await prisma.supplementLog.findFirst({
      where: { supplementId: req.params.id, userId: req.userId!, takenAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      orderBy: { takenAt: "desc" },
    });
    if (!latest) throw AppError.notFound("No dose logged today to undo");
    await prisma.supplementLog.delete({ where: { id: latest.id } });
    res.status(204).end();
  })
);

export default router;
