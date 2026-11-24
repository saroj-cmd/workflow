import { useMemo, useRef, useState, type DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Plus, Search, MessageSquare, Paperclip, Calendar, KanbanSquare } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api, qs } from "@/lib/api";
import { useAuth, isStaff } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PRIORITY, STATUS_ORDER, TASK_STATUS, isOverdue, shortDate } from "@/lib/format";
import type { Person, Project, Task, TaskStatus } from "@/lib/types";
import { Avatar, Badge, Button, EmptyState, PageHeader, Select, Skeleton } from "@/components/ui";
import { CreateTaskModal } from "@/components/TaskForm";
import { TaskDrawer } from "@/components/TaskDrawer";

export function TasksPage() {
  const { user } = useAuth();
  const staff = isStaff(user);
  const [params, setParams] = useSearchParams();
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<{ status?: TaskStatus } | null>(null);

  const { data, setData, loading } = useApi<{ tasks: Task[] }>(`/tasks${qs({ projectId, assigneeId })}`);
  const { data: pj } = useApi<{ projects: Project[] }>("/projects");
  const { data: dir } = useApi<{ users: Person[] }>(staff ? "/users/directory" : null);
  const projects = pj?.projects ?? [];
  const people = dir?.users ?? [];
  const tasks = data?.tasks ?? [];
  const setTasks = (fn: (t: Task[]) => Task[]) => setData((d) => ({ tasks: fn(d?.tasks ?? []) }));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? tasks.filter((t) => t.title.toLowerCase().includes(s) || t.key.toLowerCase().includes(s)) : tasks;
  }, [tasks, search]);
  const columns = useMemo(() => {
    const m: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    filtered.forEach((t) => m[t.status].push(t));
    Object.values(m).forEach((l) => l.sort((a, b) => a.position - b.position));
    return m;
  }, [filtered]);

  const openTask = params.get("task");
  const setOpenTask = (id: string | null) => { const p = new URLSearchParams(params); id ? p.set("task", id) : p.delete("task"); setParams(p, { replace: true }); };

  // ---- drag & drop ----
  const dragId = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ status: TaskStatus; index: number } | null>(null);

  function onDragOver(e: DragEvent<HTMLDivElement>, status: TaskStatus) {
    if (!dragId.current) return;
    e.preventDefault();
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter((c) => c.dataset.card !== dragId.current);
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { index = i; break; }
    }
    if (drop?.status !== status || drop.index !== index) setDrop({ status, index });
  }
  async function onDrop(status: TaskStatus) {
    const id = dragId.current;
    dragId.current = null;
    const target = drop;
    setDrop(null);
    if (!id || !target) return;
    const task = tasks.find((t) => t.id === id)!;
    const col = columns[status].filter((t) => t.id !== id);
    const prev = col[target.index - 1]?.position, next = col[target.index]?.position;
    const position = prev === undefined && next === undefined ? 1000 : prev === undefined ? next! - 1000 : next === undefined ? prev + 1000 : (prev + next) / 2;
    if (task.status === status && task.position === position) return;
    const before = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, position } : t)));
    try {
      await api.patch(`/tasks/${id}`, { status, position });
      if (task.status !== status) toast.success(`${task.key} → ${TASK_STATUS[status].label}`);
    } catch (e) {
      setData({ tasks: before });
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Work" title={staff ? "Work board" : "My work"}
        subtitle={staff ? "Assign work, track progress and keep everything moving." : "Drag cards as you make progress. Add comments and files in each task."}
        actions={staff && <Button icon={Plus} onClick={() => projects.length ? setCreating({}) : toast.error("Create a project first", { description: "Go to Projects to add one." })}>New task</Button>} />

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search tasks or keys…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="sm:w-52">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.key} · {p.name}</option>)}
        </Select>
        {staff && (
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="sm:w-52">
            <option value="">Everyone</option>
            <option value="none">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
      </motion.div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{STATUS_ORDER.map((s) => <Skeleton key={s} className="h-80" />)}</div>
      ) : tasks.length === 0 && !projectId && !assigneeId ? (
        <div className="card"><EmptyState icon={KanbanSquare} title={staff ? "No tasks yet" : "Nothing assigned yet"}
          text={staff ? "Create a task and assign it to someone on your team." : "When an admin assigns you work, it'll appear here."}
          action={staff && projects.length > 0 && <Button icon={Plus} onClick={() => setCreating({})}>Create the first task</Button>} /></div>
      ) : (
        <LayoutGroup>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
            {STATUS_ORDER.map((status, ci) => {
              const list = columns[status];
              const isTarget = drop?.status === status;
              return (
                <motion.div key={status} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.06 }}
                  onDragOver={(e) => onDragOver(e, status)} onDrop={() => onDrop(status)}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null); }}
                  className={clsx("flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border p-3 transition-colors xl:w-auto",
                    isTarget ? "border-brand/50 bg-brand/[0.04]" : "border-transparent bg-surface-2/60")}>
                  <div className="mb-3 flex items-center gap-2 px-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: TASK_STATUS[status].color, boxShadow: `0 0 0 4px ${TASK_STATUS[status].color.replace(")", " / 0.15)")}` }} />
                    <h3 className="text-sm font-bold">{TASK_STATUS[status].label}</h3>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted ring-1 ring-border">{list.length}</span>
                    {staff && (
                      <button onClick={() => projects.length && setCreating({ status })} aria-label={`Add task to ${TASK_STATUS[status].label}`}
                        className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"><Plus className="h-4 w-4" /></button>
                    )}
                  </div>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-2.5">
                    <AnimatePresence initial={false}>
                      {list.map((t, i) => (
                        <div key={t.id} className="contents">
                          {isTarget && drop.index === i && <DropLine />}
                          <TaskCard task={t} dragging={dragId.current === t.id} onOpen={() => setOpenTask(t.id)}
                            onDragStart={() => { dragId.current = t.id; }} onDragEnd={() => { dragId.current = null; setDrop(null); }} />
                        </div>
                      ))}
                    </AnimatePresence>
                    {isTarget && drop.index >= list.filter((t) => t.id !== dragId.current).length && <DropLine />}
                    {list.length === 0 && !isTarget && <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-border py-8 text-xs text-muted">Drop tasks here</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      <CreateTaskModal open={!!creating} onClose={() => setCreating(null)} projects={projects} people={people}
        defaults={{ projectId, status: creating?.status }} onCreated={(t) => setTasks((ts) => [...ts, t])} />
      <TaskDrawer taskId={openTask} onClose={() => setOpenTask(null)} people={people}
        onChanged={(t) => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...t } : x)))}
        onDeleted={(id) => setTasks((ts) => ts.filter((x) => x.id !== id))} />
    </>
  );
}

function DropLine() {
  return <motion.div layout initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} className="h-1 rounded-full bg-gradient-to-r from-brand to-brand-2 shadow-glow" />;
}

function TaskCard({ task, onOpen, onDragStart, onDragEnd, dragging }: {
  task: Task; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; dragging: boolean;
}) {
  const overdue = task.status !== "DONE" && isOverdue(task.dueDate);
  return (
    <motion.div layout layoutId={task.id} data-card={task.id}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: dragging ? 0.4 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}>
      <div draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd}
        onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className="group cursor-grab rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift active:cursor-grabbing">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: task.project.color }} />
          <span className="font-mono text-[11px] font-semibold text-muted">{task.key}</span>
          <Badge tone={PRIORITY[task.priority].tone} className="ml-auto !px-2 !py-0 !text-[10.5px]">{PRIORITY[task.priority].label}</Badge>
        </div>
        <p className={clsx("text-sm font-semibold leading-snug group-hover:text-brand transition-colors", task.status === "DONE" && "text-muted line-through decoration-1")}>{task.title}</p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
          {task.dueDate && (
            <span className={clsx("flex items-center gap-1 font-semibold", overdue && "rounded-md bg-danger/10 px-1.5 py-0.5 text-danger")}>
              <Calendar className="h-3 w-3" />{shortDate(task.dueDate)}
            </span>
          )}
          {task._count.comments > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{task._count.comments}</span>}
          {task._count.attachments > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{task._count.attachments}</span>}
          <span className="ml-auto"><Avatar user={task.assignee} size={24} /></span>
        </div>
      </div>
    </motion.div>
  );
}
