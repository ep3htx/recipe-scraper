import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getDashboard } from "../services/dashboard.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await getDashboard(req.userId!);
    res.json(data);
  })
);

export default router;
