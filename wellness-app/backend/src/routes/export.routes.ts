import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { collectUserData, toCSV, generateHealthReportPDF } from "../services/export.service";
import { logAudit } from "../services/auth.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/json",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await collectUserData(req.userId!);
    await logAudit(req.userId!, "export", "json", req.ip);
    res.setHeader("Content-Disposition", "attachment; filename=wellness-export.json");
    res.json(data);
  })
);

const CSV_DATASETS = ["weightEntries", "bodyMeasurements", "bloodPressure", "vitals", "waterEntries", "sleepEntries", "stepEntries", "habitEntries"] as const;

router.get(
  "/csv/:dataset",
  asyncHandler(async (req: Request, res: Response) => {
    const dataset = req.params.dataset as (typeof CSV_DATASETS)[number];
    if (!CSV_DATASETS.includes(dataset)) {
      throw AppError.badRequest(`Unknown dataset. Choose one of: ${CSV_DATASETS.join(", ")}`);
    }
    const data = await collectUserData(req.userId!);
    const csv = toCSV(data[dataset] as unknown as Record<string, unknown>[]);
    await logAudit(req.userId!, "export", `csv:${dataset}`, req.ip);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${dataset}.csv`);
    res.send(csv);
  })
);

router.get(
  "/pdf",
  asyncHandler(async (req: Request, res: Response) => {
    const pdf = await generateHealthReportPDF(req.userId!);
    await logAudit(req.userId!, "export", "pdf", req.ip);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=wellness-report.pdf");
    res.send(pdf);
  })
);

export default router;
