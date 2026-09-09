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

const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  servings: z.number().int().positive().default(1),
  prepMinutes: z.number().int().min(0).optional(),
  cookMinutes: z.number().int().min(0).optional(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.string().optional(), unit: z.string().optional() })),
  instructions: z.array(z.string()),
  caloriesPerServing: z.number().min(0).optional(),
  proteinPerServing: z.number().min(0).optional(),
  carbsPerServing: z.number().min(0).optional(),
  fatPerServing: z.number().min(0).optional(),
  fiberPerServing: z.number().min(0).optional(),
  sodiumPerServing: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const favoritesOnly = req.query.favorites === "true";
    const recipes = await prisma.recipe.findMany({
      where: {
        userId: req.userId!,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(favoritesOnly ? { isFavorite: true } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(recipes);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const recipe = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!recipe) throw AppError.notFound("Recipe not found");
    res.json(recipe);
  })
);

router.post(
  "/",
  validateBody(recipeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const recipe = await prisma.recipe.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(recipe);
  })
);

router.put(
  "/:id",
  validateBody(recipeSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Recipe not found");
    const recipe = await prisma.recipe.update({ where: { id: existing.id }, data: req.body });
    res.json(recipe);
  })
);

router.put(
  "/:id/favorite",
  validateBody(z.object({ isFavorite: z.boolean() })),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Recipe not found");
    const recipe = await prisma.recipe.update({ where: { id: existing.id }, data: { isFavorite: req.body.isFavorite } });
    res.json(recipe);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Recipe not found");
    await prisma.recipe.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
