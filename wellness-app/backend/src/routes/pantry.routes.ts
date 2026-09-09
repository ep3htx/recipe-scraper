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

const pantryItemSchema = z.object({
  name: z.string().min(1).max(150),
  quantity: z.string().max(100).optional(),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const items = await prisma.pantryItem.findMany({ where: { userId: req.userId! }, orderBy: { name: "asc" } });
    res.json(items);
  })
);

router.post(
  "/",
  validateBody(pantryItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await prisma.pantryItem.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(item);
  })
);

router.post(
  "/bulk",
  validateBody(z.object({ items: z.array(pantryItemSchema).min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const created = await prisma.$transaction(
      req.body.items.map((item: z.infer<typeof pantryItemSchema>) =>
        prisma.pantryItem.create({ data: { ...item, userId: req.userId! } })
      )
    );
    res.status(201).json(created);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.pantryItem.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Pantry item not found");
    await prisma.pantryItem.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;
