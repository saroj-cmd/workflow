import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError } from "../lib/http.js";
import { requireAuth, publicUser } from "../lib/auth.js";
import { photoUpload, relPath, removeFile } from "../lib/upload.js";

export const meRouter = Router();
meRouter.use(requireAuth);

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  department: z.string().trim().max(80).nullable().optional(),
  designation: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
});

meRouter.patch(
  "/",
  ah(async (req, res) => {
    const data = profileSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ user: publicUser(user) });
  })
);

meRouter.post(
  "/photo",
  photoUpload.single("photo"),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Please choose a photo");
    removeFile(req.user!.photoPath);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { photoPath: relPath(req.file.path) },
    });
    res.json({ user: publicUser(user) });
  })
);

meRouter.post(
  "/password",
  ah(async (req, res) => {
    const { current, next } = z
      .object({ current: z.string(), next: z.string().min(8, "New password must be at least 8 characters") })
      .parse(req.body);
    if (!(await bcrypt.compare(current, req.user!.passwordHash)))
      throw new HttpError(400, "Current password is incorrect");
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    res.json({ ok: true });
  })
);

// Employee submits their onboarding application for admin review.
meRouter.post(
  "/submit",
  ah(async (req, res) => {
    const me = req.user!;
    if (me.role !== "EMPLOYEE") throw new HttpError(400, "Only employees submit applications");
    if (!["DRAFT", "REJECTED"].includes(me.status)) throw new HttpError(400, "Your application is already submitted");
    if (!me.photoPath) throw new HttpError(400, "Please upload your photo first");
    const docs = await prisma.document.findMany({ where: { userId: me.id } });
    const hasId = docs.some((d) => ["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE", "VOTER_ID"].includes(d.type));
    if (!hasId) throw new HttpError(400, "Please upload at least one ID proof (Aadhaar, PAN, Passport…)");
    const user = await prisma.user.update({
      where: { id: me.id },
      data: { status: "PENDING", submittedAt: new Date(), reviewNote: null },
    });
    res.json({ user: publicUser(user) });
  })
);
