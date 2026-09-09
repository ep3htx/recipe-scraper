import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CHART_METRICS, PERIODS, getChartSeries, buildWeeklyReport } from "../services/progress.service";

const router = Router();
router.use(requireAuth);

const chartQuery = z.object({
  metric: z.enum(CHART_METRICS),
  period: z.enum(PERIODS).default("30d"),
});

router.get(
  "/charts",
  validateQuery(chartQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const { metric, period } = req.query as unknown as z.infer<typeof chartQuery>;
    const series = await getChartSeries(req.userId!, metric, period);
    res.json({ metric, period, series });
  })
);

router.get(
  "/weekly-report",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await buildWeeklyReport(req.userId!);
    res.json(report);
  })
);

router.get(
  "/metrics",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ metrics: CHART_METRICS, periods: PERIODS });
  })
);

export default router;
