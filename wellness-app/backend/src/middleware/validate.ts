import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

// Validates and replaces req.body/query/params with the parsed (typed,
// coerced) result so downstream handlers can trust the shape.
export const validateBody =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query);
    next();
  };
