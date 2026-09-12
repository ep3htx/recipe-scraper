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

// ---- Individual items (the meal-planning board adds/moves/removes one
// card at a time — drag a food onto a day, drag a card to another day) ----

router.post(
  "/:id/items",
  validateBody(planItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!plan) throw AppError.notFound("Meal plan not found");
    const item = await prisma.mealPlanItem.create({ data: { ...req.body, mealPlanId: plan.id } });
    res.status(201).json(item);
  })
);

router.post(
  "/:id/items/from-food",
  validateBody(
    z.object({
      foodId: z.string().uuid(),
      dayOffset: z.number().int().min(0).max(6),
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      quantity: z.number().positive().default(1),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!plan) throw AppError.notFound("Meal plan not found");
    const food = await prisma.food.findFirst({ where: { id: req.body.foodId, OR: [{ userId: req.userId! }, { userId: null }] } });
    if (!food) throw AppError.notFound("Food not found");

    const { quantity } = req.body;
    const item = await prisma.mealPlanItem.create({
      data: {
        mealPlanId: plan.id,
        dayOffset: req.body.dayOffset,
        mealType: req.body.mealType,
        foodId: food.id,
        title: food.name,
        calories: food.calories * quantity,
        protein: food.protein * quantity,
        carbs: food.carbs * quantity,
        fat: food.fat * quantity,
        fiber: food.fiber ? food.fiber * quantity : undefined,
        sodium: food.sodium ? food.sodium * quantity : undefined,
        ingredients: [{ name: food.name, quantity: food.servingSize }],
      },
    });
    res.status(201).json(item);
  })
);

router.put(
  "/:id/items/:itemId",
  validateBody(planItemSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!plan) throw AppError.notFound("Meal plan not found");
    const item = await prisma.mealPlanItem.findFirst({ where: { id: req.params.itemId, mealPlanId: plan.id } });
    if (!item) throw AppError.notFound("Item not found");
    // A drag between board cells is just this: update which day/meal-type
    // slot the item belongs to.
    const updated = await prisma.mealPlanItem.update({ where: { id: item.id }, data: req.body });
    res.json(updated);
  })
);

router.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await prisma.mealPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!plan) throw AppError.notFound("Meal plan not found");
    const item = await prisma.mealPlanItem.findFirst({ where: { id: req.params.itemId, mealPlanId: plan.id } });
    if (!item) throw AppError.notFound("Item not found");
    await prisma.mealPlanItem.delete({ where: { id: item.id } });
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
