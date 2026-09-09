import type { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps an async route handler so rejected promises reach the error middleware
// instead of crashing the process or hanging the request.
export const asyncHandler =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
