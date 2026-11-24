import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ah } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { isStaff } from "../lib/constants.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get(
  "/",
  ah(async (req, res) => {
    const me = req.user!;
    const taskWhere = isStaff(me.role) ? {} : { assigneeId: me.id };
    const [byStatus, overdue, recentActivity] = await Promise.all([
      prisma.task.groupBy({ by: ["status"], where: taskWhere, _count: true }),
      prisma.task.count({ where: { ...taskWhere, status: { not: "DONE" }, dueDate: { lt: new Date() } } }),
      prisma.activity.findMany({
        where: isStaff(me.role) ? {} : { task: { assigneeId: me.id } },
        include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, key: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
    const tasks = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const base = {
      tasks: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, ...tasks },
      overdue,
      recentActivity: recentActivity.map((a) => ({ ...a, meta: a.meta ? JSON.parse(a.meta) : null })),
    };
    if (!isStaff(me.role)) {
      const docs = await prisma.document.groupBy({ by: ["status"], where: { userId: me.id }, _count: true });
      return res.json({ ...base, documents: Object.fromEntries(docs.map((d) => [d.status, d._count])) });
    }
    const [people, pendingDocs, projects] = await Promise.all([
      prisma.user.groupBy({ by: ["status"], where: { role: "EMPLOYEE" }, _count: true }),
      prisma.document.count({ where: { status: "PENDING", user: { status: { in: ["PENDING", "APPROVED"] } } } }),
      prisma.project.count(),
    ]);
    res.json({ ...base, people: Object.fromEntries(people.map((p) => [p.status, p._count])), pendingDocs, projects });
  })
);
