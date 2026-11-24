import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError, notFound, forbidden } from "../lib/http.js";
import { requireAuth, requireRole, publicUser } from "../lib/auth.js";
import { nextEmployeeId } from "../lib/ids.js";
import { removeFile, sendFile } from "../lib/storage.js";
import { USER_STATUSES, ROLES, isStaff } from "../lib/constants.js";
import { profileSchema } from "./me.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Photo: visible to the user themself and staff; approved colleagues' photos are visible to all signed-in users.
usersRouter.get(
  "/:id/photo",
  ah(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!u?.photoPath) throw notFound("Photo");
    const me = req.user!;
    if (me.id !== u.id && !isStaff(me.role) && u.status !== "APPROVED") throw forbidden();
    const ext = u.photoPath.split(".").pop();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    await sendFile(res, u.photoPath, { contentType: type, cache: "private, max-age=300" });
  })
);

// Lightweight directory of approved people, used for assignee pickers.
usersRouter.get(
  "/directory",
  ah(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true, employeeId: true, role: true, designation: true, photoPath: true },
      orderBy: { name: "asc" },
    });
    res.json({ users: users.map(({ photoPath, ...u }) => ({ ...u, hasPhoto: !!photoPath })) });
  })
);

usersRouter.use(requireRole("ADMIN", "SUPER_ADMIN"));

usersRouter.get(
  "/",
  ah(async (req, res) => {
    const { status, role, q } = z
      .object({ status: z.enum(USER_STATUSES).optional(), role: z.enum(ROLES).optional(), q: z.string().optional() })
      .parse(req.query);
    const users = await prisma.user.findMany({
      where: {
        status,
        role,
        ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { employeeId: { contains: q, mode: "insensitive" } }] }),
      },
      include: { _count: { select: { documents: true, assigned: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users: users.map((u) => ({ ...publicUser(u), counts: u._count })) });
  })
);

usersRouter.get(
  "/:id",
  ah(async (req, res) => {
    const u = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { documents: { orderBy: { createdAt: "desc" } } },
    });
    if (!u) throw notFound("User");
    const { documents, ...rest } = u;
    res.json({ user: publicUser(rest as typeof u), documents });
  })
);

// Staff create accounts directly. Only a super admin can create admins.
usersRouter.post(
  "/",
  ah(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
        department: z.string().trim().optional(),
        designation: z.string().trim().optional(),
      })
      .parse(req.body);
    if (data.role === "ADMIN" && req.user!.role !== "SUPER_ADMIN") throw forbidden("Only a super admin can create admins");
    if (await prisma.user.findUnique({ where: { email: data.email } }))
      throw new HttpError(409, "An account with this email already exists");
    const { password, ...rest } = data;
    const user = await prisma.user.create({
      data: {
        ...rest,
        passwordHash: await bcrypt.hash(password, 10),
        employeeId: await nextEmployeeId(),
        status: data.role === "ADMIN" ? "APPROVED" : "DRAFT",
      },
    });
    res.status(201).json({ user: publicUser(user) });
  })
);

usersRouter.patch(
  "/:id",
  ah(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User");
    if (target.role !== "EMPLOYEE" && req.user!.role !== "SUPER_ADMIN") throw forbidden();
    const user = await prisma.user.update({ where: { id: target.id }, data: profileSchema.parse(req.body) });
    res.json({ user: publicUser(user) });
  })
);

// Approve / reject / suspend an employee application.
usersRouter.post(
  "/:id/review",
  ah(async (req, res) => {
    const { status, note } = z
      .object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "PENDING"]), note: z.string().trim().max(500).optional() })
      .parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User");
    if (target.id === req.user!.id) throw new HttpError(400, "You can't review your own account");
    if (target.role === "SUPER_ADMIN") throw forbidden();
    if (target.role === "ADMIN" && req.user!.role !== "SUPER_ADMIN") throw forbidden();
    if (status === "REJECTED" && !note) throw new HttpError(400, "Please add a note explaining the rejection");
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { status, reviewNote: note || null, reviewedAt: new Date() },
    });
    res.json({ user: publicUser(user) });
  })
);

usersRouter.post(
  "/:id/role",
  requireRole("SUPER_ADMIN"),
  ah(async (req, res) => {
    const { role } = z.object({ role: z.enum(["ADMIN", "EMPLOYEE"]) }).parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User");
    if (target.role === "SUPER_ADMIN") throw new HttpError(400, "Super admin's role can't be changed");
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role, ...(role === "ADMIN" && { status: "APPROVED" }) },
    });
    res.json({ user: publicUser(user) });
  })
);

usersRouter.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  ah(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { documents: true } });
    if (!target) throw notFound("User");
    if (target.role === "SUPER_ADMIN") throw new HttpError(400, "Super admin can't be deleted");
    const reported = await prisma.task.count({ where: { reporterId: target.id } });
    if (reported) throw new HttpError(400, "This user created tasks. Suspend them instead of deleting.");
    await prisma.user.delete({ where: { id: target.id } });
    removeFile(target.photoPath);
    target.documents.forEach((d) => removeFile(d.filePath));
    res.json({ ok: true });
  })
);
