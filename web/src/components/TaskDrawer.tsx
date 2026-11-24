import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, MessageSquare, History, Trash2, Send, FileText, Calendar, User as UserIcon, Flag, CircleDot, Download } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuth, isStaff } from "@/lib/auth";
import { openProtectedFile } from "@/lib/hooks";
import { ago, bytes, date, describeActivity, isOverdue, PRIORITY, STATUS_ORDER, TASK_STATUS } from "@/lib/format";
import type { Attachment, Comment, Person, Task, TaskDetail } from "@/lib/types";
import { Avatar, Button, Drawer, IconButton, Select, Skeleton, Textarea, Badge } from "./ui";

export function TaskDrawer({ taskId, onClose, people, onChanged, onDeleted }: {
  taskId: string | null; onClose: () => void; people: Person[]; onChanged: (t: Task) => void; onDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const staff = isStaff(user);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    setTask(null); setEditing(null); setTab("comments");
    if (!taskId) return;
    api.get<{ task: TaskDetail }>(`/tasks/${taskId}`).then((r) => setTask(r.task)).catch((e) => { toast.error(e.message); onClose(); });
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async () => {
    if (!taskId) return;
    const r = await api.get<{ task: TaskDetail }>(`/tasks/${taskId}`);
    setTask(r.task);
    onChanged(r.task);
  };

  async function update(patch: Record<string, unknown>) {
    if (!task) return;
    try {
      await api.patch(`/tasks/${task.id}`, patch);
      await reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function saveEdit() {
    if (!editing) return;
    setBusy("edit");
    await update({ title: editing.title, description: editing.description || null });
    setEditing(null); setBusy(null);
  }
  async function postComment() {
    if (!task || !comment.trim()) return;
    setBusy("comment");
    try {
      const { comment: c } = await api.post<{ comment: Comment }>(`/tasks/${task.id}/comments`, { body: comment });
      setTask({ ...task, comments: [...task.comments, c] });
      setComment("");
      onChanged({ ...task, _count: { ...task._count, comments: task._count.comments + 1 } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function attach(f?: File) {
    if (!task || !f) return;
    if (f.size > 20 * 1024 * 1024) return toast.error("Attachments must be under 20 MB");
    setBusy("attach");
    try {
      const fd = new FormData(); fd.append("file", f);
      await api.post<{ attachment: Attachment }>(`/tasks/${task.id}/attachments`, fd);
      await reload();
      toast.success("File attached");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function removeAttachment(a: Attachment) {
    if (!task || !confirm(`Remove ${a.fileName}?`)) return;
    try { await api.del(`/tasks/${task.id}/attachments/${a.id}`); await reload(); } catch (e) { toast.error((e as Error).message); }
  }
  async function removeTask() {
    if (!task || !confirm(`Delete ${task.key}? This can't be undone.`)) return;
    try { await api.del(`/tasks/${task.id}`); toast.success(`${task.key} deleted`); onDeleted(task.id); onClose(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Drawer open={!!taskId} onClose={onClose} width={760}>
      {!task ? (
        <div className="space-y-4 p-8"><Skeleton className="h-6 w-32" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="flex min-h-full flex-col">
          <div className="glass sticky top-0 z-10 flex items-center gap-3 border-x-0 border-t-0 px-6 py-3.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: task.project.color }} />
            <span className="text-sm font-semibold text-muted">{task.project.name}</span>
            <span className="font-mono text-sm font-semibold">{task.key}</span>
            <div className="ml-auto flex items-center gap-1">
              {staff && <IconButton icon={Trash2} label="Delete task" onClick={removeTask} className="hover:!text-danger" />}
              <IconButton icon={X} label="Close" onClick={onClose} />
            </div>
          </div>

          <div className="grid flex-1 gap-8 p-6 md:grid-cols-[1fr_220px]">
            <div className="min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <input className="input h-12 text-lg font-bold" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
                  <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" className="[&_textarea]:min-h-[140px]" />
                  <div className="flex gap-2"><Button size="sm" loading={busy === "edit"} onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
                </div>
              ) : (
                <div className={clsx(staff && "cursor-text rounded-xl -m-2 p-2 transition hover:bg-surface-2/60")}
                  onClick={() => staff && setEditing({ title: task.title, description: task.description ?? "" })}>
                  <h2 className="text-2xl font-extrabold leading-snug tracking-tight">{task.title}</h2>
                  <p className={clsx("mt-3 whitespace-pre-wrap text-[15px] leading-relaxed", !task.description && "italic text-muted")}>
                    {task.description || (staff ? "Click to add a description…" : "No description.")}
                  </p>
                </div>
              )}

              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold"><Paperclip className="h-4 w-4 text-brand" /> Attachments <span className="text-muted">{task.attachments.length}</span></h3>
                  <label className={clsx("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold transition hover:bg-surface-2", busy === "attach" && "pointer-events-none opacity-60")}>
                    <Paperclip className="h-3.5 w-3.5" />{busy === "attach" ? "Uploading…" : "Attach file"}
                    <input type="file" hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
                {task.attachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Attach reports, photos or documents related to this work.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {task.attachments.map((a) => (
                      <motion.div key={a.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="group flex items-center gap-3 rounded-xl border border-border p-2.5 transition hover:border-brand/40">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><FileText className="h-4 w-4" /></div>
                        <button className="min-w-0 flex-1 text-left" onClick={() => openProtectedFile(`/tasks/${task.id}/attachments/${a.id}`).catch((e) => toast.error(e.message))}>
                          <p className="truncate text-sm font-semibold group-hover:text-brand">{a.fileName}</p>
                          <p className="text-[11px] text-muted">{bytes(a.size)} · {a.uploader.name}</p>
                        </button>
                        <Download className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
                        {(staff || a.uploader.id === user?.id) && <IconButton icon={Trash2} label="Remove" className="h-7 w-7 hover:!text-danger" onClick={() => removeAttachment(a)} />}
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-8">
                <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 w-fit">
                  {([["comments", MessageSquare, `Comments ${task.comments.length}`], ["activity", History, "Activity"]] as const).map(([k, Icon, label]) => (
                    <button key={k} onClick={() => setTab(k)} className={clsx("relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition", tab === k ? "text-fg" : "text-muted hover:text-fg")}>
                      {tab === k && <motion.span layoutId="task-tab" className="absolute inset-0 rounded-lg bg-surface shadow-sm" />}
                      <Icon className="relative h-4 w-4" /><span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  {tab === "comments" ? (
                    <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      {task.comments.map((c) => (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                          <Avatar user={c.author} size={32} />
                          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface-2 px-4 py-2.5">
                            <p className="text-xs"><span className="font-bold">{c.author.name}</span> <span className="text-muted">· {ago(c.createdAt)}</span></p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                          </div>
                        </motion.div>
                      ))}
                      <div className="flex gap-3">
                        <Avatar user={user} size={32} />
                        <div className="flex-1">
                          <Textarea placeholder="Add an update or ask a question…" value={comment} onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }} className="[&_textarea]:min-h-[72px]" />
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-[11px] text-muted">⌘/Ctrl + Enter to send</p>
                            <Button size="sm" icon={Send} loading={busy === "comment"} disabled={!comment.trim()} onClick={postComment}>Comment</Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.ol key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {task.activities.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                          <span><span className="font-semibold">{a.actor.name}</span> <span className="text-muted">{describeActivity(a)}</span></span>
                          <span className="ml-auto text-xs text-muted">{ago(a.createdAt)}</span>
                        </li>
                      ))}
                    </motion.ol>
                  )}
                </AnimatePresence>
              </section>
            </div>

            <aside className="space-y-5 md:border-l md:border-border md:pl-6">
              <Meta icon={CircleDot} label="Status">
                <Select value={task.status} onChange={(e) => update({ status: e.target.value })}>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{TASK_STATUS[s].label}</option>)}
                </Select>
              </Meta>
              <Meta icon={UserIcon} label="Assignee">
                {staff ? (
                  <Select value={task.assignee?.id ?? ""} onChange={(e) => update({ assigneeId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                ) : <PersonChip p={task.assignee} />}
              </Meta>
              <Meta icon={Flag} label="Priority">
                {staff ? (
                  <Select value={task.priority} onChange={(e) => update({ priority: e.target.value })}>
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Select>
                ) : <Badge tone={PRIORITY[task.priority].tone}>{PRIORITY[task.priority].label}</Badge>}
              </Meta>
              <Meta icon={Calendar} label="Due date">
                {staff ? (
                  <input type="date" className="input" value={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => update({ dueDate: e.target.value || null })} />
                ) : <p className={clsx("text-sm font-semibold", isOverdue(task.dueDate) && task.status !== "DONE" && "text-danger")}>{task.dueDate ? date(task.dueDate) : "No due date"}</p>}
              </Meta>
              <Meta icon={UserIcon} label="Reporter"><PersonChip p={task.reporter} /></Meta>
              <div className="border-t border-border pt-4 text-xs text-muted space-y-1">
                <p>Created {ago(task.createdAt)}</p>
                <p>Updated {ago(task.updatedAt)}</p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Meta({ icon: Icon, label, children }: { icon: typeof Flag; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><Icon className="h-3.5 w-3.5" />{label}</p>
      {children}
    </div>
  );
}
function PersonChip({ p }: { p: Person | null }) {
  if (!p) return <p className="text-sm text-muted">Unassigned</p>;
  return <div className="flex items-center gap-2"><Avatar user={p} size={26} /><span className="text-sm font-semibold">{p.name}</span></div>;
}
