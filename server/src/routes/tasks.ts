import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError, notFound, forbidden } from "../lib/http.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { attachmentUpload, saveFile, removeFile, sendFile } from "../lib/storage.js";
import { TASK_STATUSES, PRIORITIES, isStaff } from "../lib/constants.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const personSelect = { id: true, name: true, employeeId: true, photoPath: true } as const;
const listInclude = {
  assignee: { select: personSelect },
  project: { select: { id: true, key: true, name: true, color: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

type Person = { photoPath: string | null } & Record<string, unknown>;
const person = (p: Person | null) => {
  if (!p) return null;
  const { photoPath, ...rest } = p;
  return { ...rest, hasPhoto: !!photoPath };
};
const shapeTask = <T extends { assignee?: Person | null; reporter?: Person | null }>(t: T) => ({
  ...t,
  assignee: person(t.assignee ?? null),
  ...("reporter" in t && { reporter: person(t.reporter ?? null) }),
});

async function loadTaskFor(req: Express.Request, id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw notFound("Task");
  const me = req.user!;
  if (!isStaff(me.role) && task.assigneeId !== me.id) throw forbidden();
  return task;
}

const log = (taskId: string, actorId: string, action: string, meta?: Record<string, unknown>) =>
  prisma.activity.create({ data: { taskId, actorId, action, meta: meta ? JSON.stringify(meta) : null } });

tasksRouter.get(
  "/",
  ah(async (req, res) => {
    const q = z
      .object({
        projectId: z.string().optional(),
        assigneeId: z.string().optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(PRIORITIES).optional(),
        search: z.string().optional(),
        mine: z.coerce.boolean().optional(),
      })
      .parse(req.query);
    const me = req.user!;
    const where: Prisma.TaskWhereInput = {
      projectId: q.projectId,
      status: q.status,
      priority: q.priority,
      assigneeId: !isStaff(me.role) || q.mine ? me.id : q.assigneeId === "none" ? null : q.assigneeId,
      ...(q.search && { OR: [{ title: { contains: q.search, mode: "insensitive" } }, { key: { contains: q.search.toUpperCase() } }] }),
    };
    const tasks = await prisma.task.findMany({
      where,
      include: listInclude,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });
    res.json({ tasks: tasks.map(shapeTask) });
  })
);

const createSchema = z.object({
  projectId: z.string(),
  title: z.string().trim().min(3, "Title is too short").max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES).default("TODO"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

async function assertAssignable(assigneeId?: string | null) {
  if (!assigneeId) return;
  const u = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!u) throw new HttpError(400, "Assignee not found");
  if (u.status !== "APPROVED") throw new HttpError(400, `${u.name} isn't approved yet, so work can't be assigned`);
}

tasksRouter.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN"),
  ah(async (req, res) => {
    const data = createSchema.parse(req.body);
    await assertAssignable(data.assigneeId);
    const task = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: data.projectId },
        data: { taskCounter: { increment: 1 } },
      });
      const last = await tx.task.findFirst({ where: { projectId: project.id, status: data.status }, orderBy: { position: "desc" } });
      return tx.task.create({
        data: {
          ...data,
          key: `${project.key}-${project.taskCounter}`,
          reporterId: req.user!.id,
          position: (last?.position ?? 0) + 1000,
        },
        include: listInclude,
      });
    });
    await log(task.id, req.user!.id, "created");
    if (task.assigneeId) await log(task.id, req.user!.id, "assigned", { to: task.assignee?.name });
    res.status(201).json({ task: shapeTask(task) });
  })
);

tasksRouter.get(
  "/:id",
  ah(async (req, res) => {
    await loadTaskFor(req, req.params.id);
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        ...listInclude,
        reporter: { select: personSelect },
        comments: { include: { author: { select: personSelect } }, orderBy: { createdAt: "asc" } },
        attachments: { include: { uploader: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
        activities: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    const t = task!;
    res.json({
      task: {
        ...shapeTask(t),
        comments: t.comments.map((c) => ({ ...c, author: person(c.author) })),
        activities: t.activities.map((a) => ({ ...a, meta: a.meta ? JSON.parse(a.meta) : null })),
      },
    });
  })
);

tasksRouter.patch(
  "/:id",
  ah(async (req, res) => {
    const task = await loadTaskFor(req, req.params.id);
    const me = req.user!;
    // Employees may only move their own tasks between statuses / reorder them.
    const schema = isStaff(me.role)
      ? createSchema.omit({ projectId: true }).partial().extend({ position: z.number().optional() })
      : z.object({ status: z.enum(TASK_STATUSES).optional(), position: z.number().optional() }).strict();
    const data = schema.parse(req.body) as z.infer<typeof createSchema> & { position?: number };
    if ("assigneeId" in data) await assertAssignable(data.assigneeId);
    const updated = await prisma.task.update({ where: { id: task.id }, data, include: listInclude });
    if (data.status && data.status !== task.status) await log(task.id, me.id, "status", { from: task.status, to: data.status });
    if ("assigneeId" in data && data.assigneeId !== task.assigneeId)
      await log(task.id, me.id, "assigned", { to: updated.assignee?.name ?? null });
    if (data.priority && data.priority !== task.priority) await log(task.id, me.id, "priority", { to: data.priority });
    if (data.title || data.description !== undefined || data.dueDate !== undefined)
      if (data.title !== task.title || data.description !== task.description) await log(task.id, me.id, "edited");
    res.json({ task: shapeTask(updated) });
  })
);

tasksRouter.delete(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN"),
  ah(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { attachments: true } });
    if (!task) throw notFound("Task");
    await prisma.task.delete({ where: { id: task.id } });
    task.attachments.forEach((a) => removeFile(a.filePath));
    res.json({ ok: true });
  })
);

tasksRouter.post(
  "/:id/comments",
  ah(async (req, res) => {
    const task = await loadTaskFor(req, req.params.id);
    const { body } = z.object({ body: z.string().trim().min(1, "Comment can't be empty").max(5000) }).parse(req.body);
    const comment = await prisma.comment.create({
      data: { taskId: task.id, authorId: req.user!.id, body },
      include: { author: { select: personSelect } },
    });
    await log(task.id, req.user!.id, "commented");
    res.status(201).json({ comment: { ...comment, author: person(comment.author) } });
  })
);

tasksRouter.delete(
  "/:id/comments/:commentId",
  ah(async (req, res) => {
    const c = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!c || c.taskId !== req.params.id) throw notFound("Comment");
    if (c.authorId !== req.user!.id && !isStaff(req.user!.role)) throw forbidden();
    await prisma.comment.delete({ where: { id: c.id } });
    res.json({ ok: true });
  })
);

tasksRouter.post(
  "/:id/attachments",
  attachmentUpload.single("file"),
  ah(async (req, res) => {
    const task = await loadTaskFor(req, req.params.id);
    if (!req.file) throw new HttpError(400, "Please choose a file");
    const filePath = await saveFile("attachments", req.file);
    const attachment = await prisma.attachment.create({
      data: {
        taskId: task.id,
        uploaderId: req.user!.id,
        fileName: req.file.originalname,
        filePath,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });
    await log(task.id, req.user!.id, "attached", { file: req.file.originalname });
    res.status(201).json({ attachment });
  })
);

tasksRouter.get(
  "/:id/attachments/:attId",
  ah(async (req, res) => {
    await loadTaskFor(req, req.params.id);
    const a = await prisma.attachment.findUnique({ where: { id: req.params.attId } });
    if (!a || a.taskId !== req.params.id) throw notFound("Attachment");
    await sendFile(res, a.filePath, { contentType: a.mimeType, fileName: a.fileName });
  })
);

tasksRouter.delete(
  "/:id/attachments/:attId",
  ah(async (req, res) => {
    await loadTaskFor(req, req.params.id);
    const a = await prisma.attachment.findUnique({ where: { id: req.params.attId } });
    if (!a || a.taskId !== req.params.id) throw notFound("Attachment");
    if (a.uploaderId !== req.user!.id && !isStaff(req.user!.role)) throw forbidden();
    await prisma.attachment.delete({ where: { id: a.id } });
    removeFile(a.filePath);
    res.json({ ok: true });
  })
);
