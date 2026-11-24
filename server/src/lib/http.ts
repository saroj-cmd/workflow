import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import multer from "multer";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);
export const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);

// Wraps async handlers so thrown errors reach the error middleware.
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError)
    return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input", issues: err.issues });
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
