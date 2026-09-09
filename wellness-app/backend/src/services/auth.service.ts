import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ms from "../utils/ms";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

const REFRESH_TOKEN_BYTES = 48;

export async function registerUser(email: string, password: string, name?: string) {
  if (env.SINGLE_USER_MODE) {
    const existing = await prisma.user.count();
    if (existing > 0) {
      throw AppError.forbidden(
        "This instance is in single-user mode and already has an account. Set SINGLE_USER_MODE=false to allow more.",
        "SINGLE_USER_MODE_LOCKED"
      );
    }
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw AppError.conflict("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  // Seed sensible built-in habits so the habit tracker isn't empty on day one.
  await prisma.habit.createMany({
    data: [
      { userId: user.id, name: "Log water", icon: "droplet", isBuiltIn: true },
      { userId: user.id, name: "Hit step goal", icon: "footprints", isBuiltIn: true },
      { userId: user.id, name: "Exercise", icon: "dumbbell", isBuiltIn: true },
      { userId: user.id, name: "Log all meals", icon: "utensils", isBuiltIn: true },
      { userId: user.id, name: "7+ hours sleep", icon: "moon", isBuiltIn: true },
      { userId: user.id, name: "Weekly weigh-in", icon: "scale", isBuiltIn: true, targetPerWeek: 1 },
    ],
  });

  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized("Invalid email or password");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Invalid email or password");
  return user;
}

export function signAccessToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_TTL));
  await prisma.session.create({
    data: { userId, refreshToken, userAgent, ipAddress, expiresAt },
  });
  return { refreshToken, expiresAt };
}

export async function rotateSession(oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
  const session = await prisma.session.findUnique({ where: { refreshToken: oldRefreshToken } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh session is invalid or expired");
  }
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw AppError.unauthorized("Account no longer exists");
  const next = await createSession(user.id, userAgent, ipAddress);
  return { user, ...next };
}

export async function revokeSession(refreshToken: string) {
  await prisma.session.updateMany({
    where: { refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logAudit(userId: string, action: string, detail?: string, ipAddress?: string) {
  await prisma.auditLog.create({ data: { userId, action, detail, ipAddress } });
}
