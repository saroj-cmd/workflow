import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError } from "../lib/http.js";
import { signToken, requireAuth, publicUser } from "../lib/auth.js";
import { nextEmployeeId } from "../lib/ids.js";
import { photoUpload, relPath, removeFile } from "../lib/upload.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{7,16}$/, "Please enter a valid phone number").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

// Self-registration for employees. Accepts multipart with an optional "photo".
authRouter.post(
  "/register",
  photoUpload.single("photo"),
  ah(async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists) throw new HttpError(409, "An account with this email already exists");
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash: await bcrypt.hash(data.password, 10),
          employeeId: await nextEmployeeId(),
          photoPath: req.file ? relPath(req.file.path) : null,
        },
      });
      res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
    } catch (e) {
      if (req.file) removeFile(relPath(req.file.path));
      throw e;
    }
  })
);

authRouter.post(
  "/login",
  ah(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().trim().toLowerCase(), password: z.string() })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new HttpError(401, "Incorrect email or password");
    if (user.status === "SUSPENDED") throw new HttpError(403, "Your account is suspended");
    res.json({ token: signToken(user.id), user: publicUser(user) });
  })
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});
