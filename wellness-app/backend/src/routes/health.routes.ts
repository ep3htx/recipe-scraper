import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

export default router;
