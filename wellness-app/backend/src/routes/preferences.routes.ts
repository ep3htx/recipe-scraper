import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

const router = Router();
router.use(requireAuth);

export const PREFERENCE_CATEGORIES = [
  "favorite_foods",
  "disliked_foods",
  "dietary_restrictions",
  "favorite_meals",
  "meal_times",
  "cooking_prefs",
  "workout_schedule",
  "weekly_goals",
  "successful_strategies",
] as const;

const prefSchema = z.object({
  category: z.enum(PREFERENCE_CATEGORIES),
  key: z.string().min(1).max(150),
  value: z.unknown(),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const prefs = await prisma.userPreference.findMany({
      where: { userId: req.userId!, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
    res.json(prefs);
  })
);

router.put(
  "/",
  validateBody(prefSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, key, value } = req.body;
    const pref = await prisma.userPreference.upsert({
      where: { userId_category_key: { userId: req.userId!, category, key } },
      update: { value: value as never },
      create: { userId: req.userId!, category, key, value: value as never },
    });
    res.json(pref);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.userPreference.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Preference not found");
    await prisma.userPreference.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
