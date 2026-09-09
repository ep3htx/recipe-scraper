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

const foodSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).optional(),
  servingSize: z.string().min(1).max(100),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const favoritesOnly = req.query.favorites === "true";
    const foods = await prisma.food.findMany({
      where: {
        OR: [{ userId: req.userId! }, { userId: null }],
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(favoritesOnly ? { isFavorite: true } : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
    });
    res.json(foods);
  })
);

router.post(
  "/",
  validateBody(foodSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const food = await prisma.food.create({ data: { ...req.body, userId: req.userId!, isCustom: true } });
    res.status(201).json(food);
  })
);

router.put(
  "/:id",
  validateBody(foodSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.food.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Food not found");
    const food = await prisma.food.update({ where: { id: existing.id }, data: req.body });
    res.json(food);
  })
);

router.put(
  "/:id/favorite",
  validateBody(z.object({ isFavorite: z.boolean() })),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.food.findFirst({ where: { id: req.params.id, OR: [{ userId: req.userId! }, { userId: null }] } });
    if (!existing) throw AppError.notFound("Food not found");
    const food = await prisma.food.update({ where: { id: existing.id }, data: { isFavorite: req.body.isFavorite } });
    res.json(food);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.food.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Food not found");
    await prisma.food.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
