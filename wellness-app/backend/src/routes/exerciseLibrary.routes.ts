import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";

const router = Router();
router.use(requireAuth);

// Searchable/filterable catalog behind the workout-program builder and the
// "browse exercises" screen — separate from /api/exercise, which logs
// actual workout sessions.
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const muscleGroup = typeof req.query.muscleGroup === "string" ? req.query.muscleGroup : undefined;
    const bodyweightOnly = req.query.bodyweightOnly === "true";

    const exercises = await prisma.exercise.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(category ? { category } : {}),
        ...(muscleGroup ? { muscleGroup } : {}),
        ...(bodyweightOnly ? { category: "bodyweight" } : {}),
      },
      orderBy: { name: "asc" },
      take: 300,
    });
    res.json(exercises);
  })
);

router.get(
  "/muscle-groups",
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await prisma.exercise.findMany({
      where: { muscleGroup: { not: null } },
      select: { muscleGroup: true },
      distinct: ["muscleGroup"],
      orderBy: { muscleGroup: "asc" },
    });
    res.json(rows.map((r) => r.muscleGroup));
  })
);

export default router;
