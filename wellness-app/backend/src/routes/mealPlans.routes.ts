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

const planItemSchema = z.object({
  dayOffset: z.number().int().min(0).max(6),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(1).max(200),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.string().optional() })).optional(),
  instructions: z.array(z.string()).optional(),
});

const planSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  items: z.array(planItemSchema).default([]),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const plans = await prisma.mealPlan.findMany({
      where: { userId: req.userId! },
      orderBy: { startDate: "desc" },
      include: { items: true },
      take: 20,
    });
    res.json(plans);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! }, include: { items: true } });
    if (!plan) throw AppError.notFound("Meal plan not found");
    res.json(plan);
  })
);

router.post(
  "/",
  validateBody(planSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, ...planData } = req.body;
    const plan = await prisma.mealPlan.create({
      data: { ...planData, userId: req.userId!, generatedBy: "user", items: { create: items } },
      include: { items: true },
    });
    res.status(201).json(plan);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Meal plan not found");
    await prisma.mealPlan.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

// Converts every ingredient across the plan's meals into a single grocery
// list, grouped by category (best-effort categorization by keyword).
router.post(
  "/:id/grocery-list",
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! }, include: { items: true } });
    if (!plan) throw AppError.notFound("Meal plan not found");

    const { categorize } = await import("../services/grocery.service");
    const ingredientNames = new Map<string, string | undefined>();
    for (const item of plan.items) {
      const ingredients = (item.ingredients as { name: string; quantity?: string }[] | null) ?? [];
      for (const ing of ingredients) {
        if (!ingredientNames.has(ing.name)) ingredientNames.set(ing.name, ing.quantity);
      }
    }

    const list = await prisma.groceryList.create({
      data: {
        userId: req.userId!,
        mealPlanId: plan.id,
        name: `Groceries: ${plan.name}`,
        items: {
          create: Array.from(ingredientNames.entries()).map(([name, quantity]) => ({
            name,
            quantity,
            category: categorize(name),
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(list);
  })
);

export default router;
