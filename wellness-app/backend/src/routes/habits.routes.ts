import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { toDateOnly } from "../utils/date";
import { calcStreak, habitCompletionRate } from "../services/habits.service";

const router = Router();
router.use(requireAuth);

const habitSchema = z.object({
  name: z.string().min(1).max(120),
  icon: z.string().max(60).optional(),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const habits = await prisma.habit.findMany({ where: { userId: req.userId!, active: true }, orderBy: { createdAt: "asc" } });
    const withStats = await Promise.all(
      habits.map(async (h) => ({
        ...h,
        streak: await calcStreak(req.userId!, h.id),
        weeklyRate: await habitCompletionRate(req.userId!, h.id, 7),
        monthlyRate: await habitCompletionRate(req.userId!, h.id, 30),
      }))
    );
    res.json(withStats);
  })
);

router.post(
  "/",
  validateBody(habitSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const habit = await prisma.habit.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(habit);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!habit) throw AppError.notFound("Habit not found");
    await prisma.habit.update({ where: { id: habit.id }, data: { active: false } });
    res.status(204).end();
  })
);

const toggleSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  completed: z.boolean().default(true),
});

router.put(
  "/:id/entries",
  validateBody(toggleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!habit) throw AppError.notFound("Habit not found");
    const day = toDateOnly(req.body.date);
    const entry = await prisma.habitEntry.upsert({
      where: { habitId_date: { habitId: habit.id, date: day } },
      update: { completed: req.body.completed },
      create: { habitId: habit.id, userId: req.userId!, date: day, completed: req.body.completed },
    });
    res.json(entry);
  })
);

router.get(
  "/entries",
  asyncHandler(async (req: Request, res: Response) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86_400_000);
    const entries = await prisma.habitEntry.findMany({
      where: { userId: req.userId!, date: { gte: from } },
      orderBy: { date: "desc" },
    });
    res.json(entries);
  })
);

export default router;
