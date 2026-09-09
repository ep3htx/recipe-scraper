import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// General API rate limit (defense in depth — Nginx also rate-limits at the edge).
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limit for auth endpoints to slow down credential guessing.
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again shortly" } },
});
