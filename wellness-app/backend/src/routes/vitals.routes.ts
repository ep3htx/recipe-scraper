import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { flagRange } from "../services/vitalRange.service";

const router = Router();
router.use(requireAuth);

// ---- Blood pressure ----

const bpSchema = z.object({
  systolic: z.number().int().positive(),
  diastolic: z.number().int().positive(),
  pulse: z.number().int().positive().optional(),
  recordedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(2000).optional(),
});

router.get(
  "/blood-pressure",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const [entries, range] = await Promise.all([
      prisma.bloodPressureReading.findMany({
        where: { userId: req.userId!, ...dateRangeWhere("recordedAt", q) },
        orderBy: { recordedAt: "desc" },
        take: q.limit,
      }),
      prisma.vitalRange.findUnique({ where: { userId: req.userId! } }),
    ]);
    const withFlags = entries.map((e) => ({
      ...e,
      flags: [
        flagRange("systolic", e.systolic, range?.systolicMin, range?.systolicMax),
        flagRange("diastolic", e.diastolic, range?.diastolicMin, range?.diastolicMax),
        flagRange("pulse", e.pulse, range?.pulseMin, range?.pulseMax),
      ].filter(Boolean),
    }));
    res.json(withFlags);
  })
);

router.post(
  "/blood-pressure",
  validateBody(bpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.bloodPressureReading.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(entry);
  })
);

router.delete(
  "/blood-pressure/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.bloodPressureReading.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Reading not found");
    await prisma.bloodPressureReading.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

// ---- Other vitals ----

const vitalsSchema = z.object({
  restingHeartRate: z.number().int().positive().optional(),
  bloodOxygen: z.number().min(0).max(100).optional(),
  temperature: z.number().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  recordedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(2000).optional(),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.vitalsReading.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("recordedAt", q) },
      orderBy: { recordedAt: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.post(
  "/",
  validateBody(vitalsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.vitalsReading.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.vitalsReading.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Reading not found");
    await prisma.vitalsReading.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

// ---- Personal target ranges ----

const rangeSchema = z.object({
  systolicMin: z.number().int().optional(),
  systolicMax: z.number().int().optional(),
  diastolicMin: z.number().int().optional(),
  diastolicMax: z.number().int().optional(),
  pulseMin: z.number().int().optional(),
  pulseMax: z.number().int().optional(),
  restingHRMin: z.number().int().optional(),
  restingHRMax: z.number().int().optional(),
  spo2Min: z.number().optional(),
  temperatureMin: z.number().optional(),
  temperatureMax: z.number().optional(),
  respiratoryRateMin: z.number().int().optional(),
  respiratoryRateMax: z.number().int().optional(),
});

router.get(
  "/ranges",
  asyncHandler(async (req: Request, res: Response) => {
    const range = await prisma.vitalRange.findUnique({ where: { userId: req.userId! } });
    res.json(range);
  })
);

router.put(
  "/ranges",
  validateBody(rangeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const range = await prisma.vitalRange.upsert({
      where: { userId: req.userId! },
      update: req.body,
      create: { ...req.body, userId: req.userId! },
    });
    res.json(range);
  })
);

export default router;
