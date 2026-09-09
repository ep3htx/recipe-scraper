import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { startOfDay, endOfDay } from "../utils/date";
import { resolveMealItems, sumNutrition } from "../services/nutrition.service";

const router = Router();
router.use(requireAuth);

const mealItemSchema = z.object({
  foodId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  description: z.string().max(300).optional(),
  quantity: z.number().positive().default(1),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
});

const mealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  eatenAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(2000).optional(),
  items: z.array(mealItemSchema).min(1),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const meals = await prisma.meal.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("eatenAt", q) },
      orderBy: { eatenAt: "desc" },
      take: q.limit,
      include: { items: true },
    });
    res.json(meals);
  })
);

router.get(
  "/today",
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const meals = await prisma.meal.findMany({
      where: { userId: req.userId!, eatenAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      include: { items: true },
      orderBy: { eatenAt: "asc" },
    });
    const totals = sumNutrition(meals.flatMap((m) => m.items));
    res.json({ meals, totals });
  })
);

router.post(
  "/",
  validateBody(mealSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, ...mealData } = req.body;
    const resolvedItems = await resolveMealItems(req.userId!, items);
    const meal = await prisma.meal.create({
      data: {
        ...mealData,
        userId: req.userId!,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });
    res.status(201).json(meal);
  })
);

router.put(
  "/:id",
  validateBody(mealSchema.partial().extend({ items: z.array(mealItemSchema).optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.meal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Meal not found");
    const { items, ...mealData } = req.body;

    if (items) {
      const resolvedItems = await resolveMealItems(req.userId!, items);
      await prisma.mealItem.deleteMany({ where: { mealId: existing.id } });
      await prisma.meal.update({
        where: { id: existing.id },
        data: { ...mealData, items: { create: resolvedItems } },
      });
    } else if (Object.keys(mealData).length > 0) {
      await prisma.meal.update({ where: { id: existing.id }, data: mealData });
    }

    const meal = await prisma.meal.findUnique({ where: { id: existing.id }, include: { items: true } });
    res.json(meal);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.meal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Meal not found");
    await prisma.meal.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
