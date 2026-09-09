import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { getActiveGoal, setGoal } from "../services/goals.service";

const router = Router();
router.use(requireAuth);

const goalSchema = z.object({
  startingWeight: z.number().positive().optional(),
  goalWeight: z.number().positive().optional(),
  targetDate: z.coerce.date().optional(),
  calorieTarget: z.number().int().positive().optional(),
  proteinTarget: z.number().int().positive().optional(),
  carbTarget: z.number().int().positive().optional(),
  fatTarget: z.number().int().positive().optional(),
  fiberTarget: z.number().int().positive().optional(),
  sodiumTarget: z.number().int().positive().optional(),
  waterTargetOz: z.number().int().positive().optional(),
  stepsTarget: z.number().int().positive().optional(),
  workoutsPerWeek: z.number().int().min(0).max(14).optional(),
  exerciseMinutesTarget: z.number().int().positive().optional(),
  bpSystolicTarget: z.number().int().positive().optional(),
  bpDiastolicTarget: z.number().int().positive().optional(),
  restingHRTarget: z.number().int().positive().optional(),
});

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const goal = await getActiveGoal(req.userId!);
    res.json(goal);
  })
);

router.put(
  "/",
  validateBody(goalSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const goal = await setGoal(req.userId!, req.body);
    res.json(goal);
  })
);

export default router;
