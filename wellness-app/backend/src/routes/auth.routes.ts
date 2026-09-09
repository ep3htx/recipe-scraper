import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { AppError } from "../utils/AppError";
import {
  registerUser,
  verifyCredentials,
  signAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  logAudit,
} from "../services/auth.service";

const router = Router();

const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(120).optional(),
});

router.post(
  "/register",
  authLimiter,
  validateBody(credentialsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    const user = await registerUser(email, password, name);
    const accessToken = signAccessToken(user.id, user.email);
    const { refreshToken, expiresAt } = await createSession(user.id, req.headers["user-agent"], req.ip);
    setRefreshCookie(res, refreshToken, expiresAt);
    await logAudit(user.id, "register", undefined, req.ip);
    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  })
);

router.post(
  "/login",
  authLimiter,
  validateBody(credentialsSchema.pick({ email: true, password: true })),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await verifyCredentials(email, password);
    const accessToken = signAccessToken(user.id, user.email);
    const { refreshToken, expiresAt } = await createSession(user.id, req.headers["user-agent"], req.ip);
    setRefreshCookie(res, refreshToken, expiresAt);
    await logAudit(user.id, "login", undefined, req.ip);
    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw AppError.unauthorized("No refresh session");
    const { user, refreshToken, expiresAt } = await rotateSession(token, req.headers["user-agent"], req.ip);
    setRefreshCookie(res, refreshToken, expiresAt);
    const accessToken = signAccessToken(user.id, user.email);
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await revokeSession(token);
    clearRefreshCookie(res);
    res.status(204).end();
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw AppError.unauthorized();
    res.json({ id: user.id, email: user.email, name: user.name, unitSystem: user.unitSystem, theme: user.theme });
  })
);

export default router;
