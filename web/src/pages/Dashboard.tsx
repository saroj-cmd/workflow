import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ListTodo, Loader, Eye, CheckCircle2, AlertCircle, UserCheck, FileClock, FolderKanban, ArrowRight, Activity as ActivityIcon, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth, isStaff } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { ago, describeActivity, PRIORITY, TASK_STATUS, isOverdue, shortDate } from "@/lib/format";
import type { Activity, Task, TaskStatus } from "@/lib/types";
import { AnimatedNumber, Avatar, Badge, EmptyState, PageHeader, ProgressRing, Skeleton, stagger } from "@/components/ui";

interface Stats {
  tasks: Record<TaskStatus, number>; overdue: number; recentActivity: Activity[];
  people?: Record<string, number>; pendingDocs?: number; projects?: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const staff = isStaff(user);
  const { data: stats } = useApi<Stats>("/stats");
  const { data: mine } = useApi<{ tasks: Task[] }>("/tasks?mine=1");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const t = stats?.tasks;
  const total = t ? Object.values(t).reduce((a, b) => a + b, 0) : 0;
  const open = (mine?.tasks ?? []).filter((x) => x.status !== "DONE").slice(0, 6);

  const cards = [
    { label: "To do", value: t?.TODO, icon: ListTodo, color: "from-slate-400 to-slate-500" },
    { label: "In progress", value: t?.IN_PROGRESS, icon: Loader, color: "from-sky-400 to-blue-500" },
    { label: "In review", value: t?.IN_REVIEW, icon: Eye, color: "from-amber-400 to-orange-500" },
    { label: "Done", value: t?.DONE, icon: CheckCircle2, color: "from-emerald-400 to-teal-500" },
  ];

  return (
    <>
      <PageHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        title={`${greet}, ${user?.name.split(" ")[0]}`}
        subtitle={staff ? "Here's what's happening across your team." : "Here's your work at a glance."} />

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <motion.div key={c.label} variants={stagger.item} whileHover={{ y: -3 }} className="card relative overflow-hidden p-5">
            <div className={clsx("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 blur-xl", c.color)} />
            <div className={clsx("mb-4 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", c.color)}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-extrabold tracking-tight">{c.value === undefined ? <Skeleton className="h-8 w-12" /> : <AnimatedNumber value={c.value} />}</div>
            <p className="mt-0.5 text-sm font-medium text-muted">{c.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {staff && stats && (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="mt-4 grid gap-4 md:grid-cols-3">
          <MiniStat to="/people?status=PENDING" icon={UserCheck} label="Applications to review" value={stats.people?.PENDING ?? 0} highlight={!!stats.people?.PENDING} />
          <MiniStat to="/people" icon={FileClock} label="Documents awaiting verification" value={stats.pendingDocs ?? 0} highlight={!!stats.pendingDocs} />
          <MiniStat to="/people?status=APPROVED" icon={Users} label="Active employees" value={stats.people?.APPROVED ?? 0} />
        </motion.div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{staff ? "Assigned to me" : "My open work"}</h2>
            <Link to="/tasks" className="group flex items-center gap-1 text-sm font-semibold text-brand">Open board <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
          </div>
          {!mine ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            : open.length === 0 ? <EmptyState icon={CheckCircle2} title="You're all caught up" text={staff ? "Nothing is assigned to you. Create tasks from the work board." : "No open work right now. New assignments will show up here."} />
            : (
              <motion.ul variants={stagger.container} initial="hidden" animate="show" className="divide-y divide-border">
                {open.map((task) => (
                  <motion.li key={task.id} variants={stagger.item}>
                    <Link to={`/tasks?task=${task.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-surface-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TASK_STATUS[task.status].color }} />
                      <span className="font-mono text-xs text-muted">{task.key}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{task.title}</span>
                      {task.dueDate && <span className={clsx("hidden text-xs sm:block", isOverdue(task.dueDate) ? "font-semibold text-danger" : "text-muted")}>{shortDate(task.dueDate)}</span>}
                      <Badge tone={PRIORITY[task.priority].tone}>{PRIORITY[task.priority].label}</Badge>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
        </div>

        <div className="space-y-6">
          <div className="card flex items-center gap-5 p-6">
            <div className="relative">
              <ProgressRing value={total ? (t!.DONE / total) : 0} size={84} stroke={8} />
              <span className="absolute inset-0 grid place-items-center text-lg font-extrabold">{total ? Math.round((t!.DONE / total) * 100) : 0}%</span>
            </div>
            <div>
              <p className="text-lg font-bold">Completion</p>
              <p className="text-sm text-muted">{t?.DONE ?? 0} of {total} {staff ? "tasks across all projects" : "of your tasks"} done</p>
              {!!stats?.overdue && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-danger"><AlertCircle className="h-4 w-4" />{stats.overdue} overdue</p>}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><ActivityIcon className="h-4 w-4 text-brand" /> Recent activity</h2>
            {!stats ? <Skeleton className="h-40" /> : stats.recentActivity.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
              <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                {stats.recentActivity.map((a, i) => (
                  <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex gap-3">
                    <Avatar user={{ ...a.actor, hasPhoto: false }} size={30} ring />
                    <div className="min-w-0 text-sm">
                      <p><span className="font-semibold">{a.actor.name}</span> <span className="text-muted">{describeActivity(a)}</span></p>
                      {a.task && <Link to={`/tasks?task=${a.task.id}`} className="block truncate text-xs text-brand hover:underline">{a.task.key} · {a.task.title}</Link>}
                      <p className="text-[11px] text-muted">{ago(a.createdAt)}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
          {staff && stats?.projects === 0 && (
            <Link to="/projects" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white"><FolderKanban className="h-5 w-5" /></div>
              <div className="flex-1"><p className="font-bold">Create your first project</p><p className="text-xs text-muted">Projects group tasks, like OPS or HR.</p></div>
              <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function MiniStat({ to, icon: Icon, label, value, highlight }: { to: string; icon: typeof Users; label: string; value: number; highlight?: boolean }) {
  return (
    <motion.div variants={stagger.item}>
      <Link to={to} className={clsx("card group flex items-center gap-4 p-4 transition hover:shadow-lift", highlight && "ring-1 ring-warning/40")}>
        <div className={clsx("grid h-10 w-10 place-items-center rounded-xl", highlight ? "bg-warning/15 text-warning" : "bg-brand/10 text-brand")}><Icon className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-xl font-extrabold"><AnimatedNumber value={value} /></p>
          <p className="text-xs text-muted">{label}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}
