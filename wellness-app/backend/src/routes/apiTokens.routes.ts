import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth, generateApiToken, hashApiToken } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { logAudit } from "../services/auth.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    res.json(tokens);
  })
);

router.post(
  "/",
  validateBody(z.object({ name: z.string().min(1).max(100) })),
  asyncHandler(async (req: Request, res: Response) => {
    const token = generateApiToken();
    const record = await prisma.apiToken.create({
      data: { userId: req.userId!, name: req.body.name, tokenHash: hashApiToken(token) },
      select: { id: true, name: true, createdAt: true },
    });
    await logAudit(req.userId!, "api_token_created", req.body.name, req.ip);
    // The plaintext token is only ever visible in this one response — only
    // the hash is stored, so there's no way to show it again later.
    res.status(201).json({ ...record, token });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.apiToken.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Token not found");
    await prisma.apiToken.delete({ where: { id: existing.id } });
    await logAudit(req.userId!, "api_token_revoked", existing.name, req.ip);
    res.status(204).end();
  })
);

export default router;
