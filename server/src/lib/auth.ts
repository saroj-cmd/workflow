import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@prisma/client";
import { prisma } from "./prisma.js";
import { HttpError, forbidden } from "./http.js";
import type { Role } from "./constants.js";

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error("JWT_SECRET is not set");

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const signToken = (userId: string) => jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });

// Bearer-token auth: works the same for the web app and future mobile apps.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Please sign in");
    const payload = jwt.verify(header.slice(7), SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, "Session expired, please sign in again");
    if (user.status === "SUSPENDED") throw new HttpError(403, "Your account is suspended");
    req.user = user;
    next();
  } catch (e) {
    next(e instanceof HttpError ? e : new HttpError(401, "Session expired, please sign in again"));
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) return next(forbidden());
    next();
  };

export const publicUser = (u: User) => {
  const { passwordHash, photoPath, ...rest } = u;
  return { ...rest, hasPhoto: !!photoPath };
};
