import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { logAudit } from "../services/auth.service";

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  heightInches: z.number().positive().optional(),
  unitSystem: z.enum(["imperial", "metric"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

router.put(
  "/me",
  validateBody(profileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.update({ where: { id: req.userId! }, data: req.body });
    res.json({ id: user.id, email: user.email, name: user.name, heightInches: user.heightInches, unitSystem: user.unitSystem, theme: user.theme });
  })
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.put(
  "/me/password",
  validateBody(passwordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw AppError.notFound();
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Current password is incorrect");
    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await logAudit(user.id, "password_change", undefined, req.ip);
    res.status(204).end();
  })
);

router.get(
  "/me/audit-log",
  asyncHandler(async (req: Request, res: Response) => {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(logs);
  })
);

export default router;
