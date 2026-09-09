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

const CATEGORIES = ["produce", "meat", "dairy", "frozen", "pantry", "grains", "canned", "spices", "beverages", "other"] as const;

const itemSchema = z.object({
  name: z.string().min(1).max(150),
  quantity: z.string().max(100).optional(),
  category: z.enum(CATEGORIES).default("other"),
});

router.get(
  "/categories",
  asyncHandler(async (_req: Request, res: Response) => res.json(CATEGORIES))
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const lists = await prisma.groceryList.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { category: "asc" } } },
    });
    res.json(lists);
  })
);

router.post(
  "/",
  validateBody(z.object({ name: z.string().min(1).max(150).default("Grocery List"), items: z.array(itemSchema).default([]) })),
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.groceryList.create({
      data: { name: req.body.name, userId: req.userId!, items: { create: req.body.items } },
      include: { items: true },
    });
    res.status(201).json(list);
  })
);

router.post(
  "/:id/items",
  validateBody(itemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.groceryList.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!list) throw AppError.notFound("Grocery list not found");
    const item = await prisma.groceryItem.create({ data: { ...req.body, groceryListId: list.id } });
    res.status(201).json(item);
  })
);

router.put(
  "/:listId/items/:itemId",
  validateBody(itemSchema.partial().extend({ purchased: z.boolean().optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.groceryList.findFirst({ where: { id: req.params.listId, userId: req.userId! } });
    if (!list) throw AppError.notFound("Grocery list not found");
    const item = await prisma.groceryItem.findFirst({ where: { id: req.params.itemId, groceryListId: list.id } });
    if (!item) throw AppError.notFound("Item not found");
    const updated = await prisma.groceryItem.update({ where: { id: item.id }, data: req.body });
    res.json(updated);
  })
);

router.delete(
  "/:listId/items/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.groceryList.findFirst({ where: { id: req.params.listId, userId: req.userId! } });
    if (!list) throw AppError.notFound("Grocery list not found");
    const item = await prisma.groceryItem.findFirst({ where: { id: req.params.itemId, groceryListId: list.id } });
    if (!item) throw AppError.notFound("Item not found");
    await prisma.groceryItem.delete({ where: { id: item.id } });
    res.status(204).end();
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.groceryList.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!list) throw AppError.notFound("Grocery list not found");
    await prisma.groceryList.delete({ where: { id: list.id } });
    res.status(204).end();
  })
);

export default router;
