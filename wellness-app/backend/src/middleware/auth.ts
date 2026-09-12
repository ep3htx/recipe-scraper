import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// Personal access tokens (for iOS Shortcuts, scripts, etc.) are distinguished
// from short-lived JWT access tokens by this prefix, and hashed the same way
// GitHub does it — SHA-256, fast exact-match lookup, since the token itself
// is already high-entropy (unlike a password, no per-token salt is needed).
export const API_TOKEN_PREFIX = "wln_";

export function generateApiToken(): string {
  return API_TOKEN_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing access token"));
  }
  const token = header.slice("Bearer ".length);

  if (token.startsWith(API_TOKEN_PREFIX)) {
    try {
      const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash: hashApiToken(token) } });
      if (!apiToken) return next(AppError.unauthorized("Invalid API token"));
      req.userId = apiToken.userId;
      // Fire-and-forget — don't hold up the request on a bookkeeping write.
      prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
      return next();
    } catch {
      return next(AppError.unauthorized("Invalid API token"));
    }
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.userId = payload.sub;
    req.userEmail = payload.email;
    return next();
  } catch {
    return next(AppError.unauthorized("Invalid or expired access token"));
  }
}
