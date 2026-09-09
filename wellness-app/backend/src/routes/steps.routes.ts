import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { dateRangeQuery, dateRangeWhere } from "../utils/query";
import { prisma } from "../db/prisma";
import { toDateOnly } from "../utils/date";

const router = Router();
router.use(requireAuth);

const stepsSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  steps: z.number().int().min(0),
});

router.get(
  "/",
  validateQuery(dateRangeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof dateRangeQuery>;
    const entries = await prisma.stepEntry.findMany({
      where: { userId: req.userId!, ...dateRangeWhere("date", q) },
      orderBy: { date: "desc" },
      take: q.limit,
    });
    res.json(entries);
  })
);

router.put(
  "/",
  validateBody(stepsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const day = toDateOnly(req.body.date);
    const entry = await prisma.stepEntry.upsert({
      where: { userId_date: { userId: req.userId!, date: day } },
      update: { steps: req.body.steps },
      create: { userId: req.userId!, date: day, steps: req.body.steps },
    });
    res.json(entry);
  })
);

export default router;
