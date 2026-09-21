import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { normalizeBarcode, lookupBarcode } from "../services/barcode.service";

const router = Router();
router.use(requireAuth);

// GET /api/barcode/:code - resolve a scanned/typed barcode to a saved food or
// supplement, or to a candidate pulled from Open Food Facts (not yet saved).
router.get(
  "/:code",
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await lookupBarcode(req.userId!, req.params.code));
  })
);

const saveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("food"),
    code: z.string().min(1).max(32),
    name: z.string().min(1).max(200),
    brand: z.string().max(200).optional(),
    servingSize: z.string().min(1).max(100).default("1 serving"),
    calories: z.number().min(0),
    protein: z.number().min(0).default(0),
    carbs: z.number().min(0).default(0),
    fat: z.number().min(0).default(0),
    fiber: z.number().min(0).optional(),
    sodium: z.number().min(0).optional(),
  }),
  z.object({
    kind: z.literal("supplement"),
    code: z.string().min(1).max(32),
    name: z.string().min(1).max(200),
    brand: z.string().max(200).optional(),
    servingSize: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  }),
]);

// POST /api/barcode - save a new product against its barcode so the next scan
// resolves instantly from the local library. Idempotent per user + barcode.
router.post(
  "/",
  validateBody(saveSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const body = req.body as z.infer<typeof saveSchema>;
    const barcode = normalizeBarcode(body.code);

    if (body.kind === "food") {
      const existing = await prisma.food.findFirst({ where: { userId, barcode } });
      if (existing) return res.json({ kind: "food", food: existing });
      const { kind: _kind, code: _code, ...data } = body;
      const food = await prisma.food.create({ data: { ...data, barcode, userId, isCustom: true } });
      return res.status(201).json({ kind: "food", food });
    }

    const existing = await prisma.supplement.findFirst({ where: { userId, barcode } });
    if (existing) return res.json({ kind: "supplement", supplement: existing });
    const { kind: _kind, code: _code, ...data } = body;
    const supplement = await prisma.supplement.create({ data: { ...data, barcode, userId } });
    return res.status(201).json({ kind: "supplement", supplement });
  })
);

export default router;
