import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError, notFound } from "../lib/http.js";
import { requireAuth, requireRole } from "../lib/auth.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get(
  "/",
  ah(async (_req, res) => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    const done = await prisma.task.groupBy({ by: ["projectId"], where: { status: "DONE" }, _count: true });
    const doneMap = Object.fromEntries(done.map((d) => [d.projectId, d._count]));
    res.json({
      projects: projects.map(({ _count, ...p }) => ({ ...p, taskCount: _count.tasks, doneCount: doneMap[p.id] ?? 0 })),
    });
  })
);

const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is too short").max(80),
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9]{1,5}$/, "Key must be 2–6 letters/numbers, e.g. OPS"),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

projectsRouter.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN"),
  ah(async (req, res) => {
    const data = projectSchema.parse(req.body);
    if (await prisma.project.findUnique({ where: { key: data.key } }))
      throw new HttpError(409, "A project with this key already exists");
    const project = await prisma.project.create({ data: { ...data, createdById: req.user!.id } });
    res.status(201).json({ project });
  })
);

projectsRouter.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN"),
  ah(async (req, res) => {
    const data = projectSchema.omit({ key: true }).partial().parse(req.body);
    const project = await prisma.project.update({ where: { id: req.params.id }, data }).catch(() => {
      throw notFound("Project");
    });
    res.json({ project });
  })
);

projectsRouter.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  ah(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.id } }).catch(() => {
      throw notFound("Project");
    });
    res.json({ ok: true });
  })
);
