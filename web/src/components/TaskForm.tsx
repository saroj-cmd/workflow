import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PRIORITY, STATUS_ORDER, TASK_STATUS } from "@/lib/format";
import type { Person, Priority, Project, Task, TaskStatus } from "@/lib/types";
import { Button, Input, Modal, Select, Textarea } from "./ui";

export function CreateTaskModal({ open, onClose, projects, people, onCreated, defaults }: {
  open: boolean; onClose: () => void; projects: Project[]; people: Person[]; onCreated: (t: Task) => void;
  defaults?: { projectId?: string; status?: TaskStatus };
}) {
  const blank = () => ({
    projectId: defaults?.projectId || projects[0]?.id || "", title: "", description: "",
    priority: "MEDIUM" as Priority, status: defaults?.status ?? ("TODO" as TaskStatus), assigneeId: "", dueDate: "",
  });
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(blank()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!f.projectId) return toast.error("Create a project first");
    if (f.title.trim().length < 3) return toast.error("Give the task a clear title");
    setBusy(true);
    try {
      const { task } = await api.post<{ task: Task }>("/tasks", {
        ...f, assigneeId: f.assigneeId || null, dueDate: f.dueDate || null, description: f.description || undefined,
      });
      toast.success(`${task.key} created`, { description: task.assignee ? `Assigned to ${task.assignee.name}` : undefined });
      onCreated(task);
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title="New task" description="Create work and assign it to someone." width={600}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} onClick={submit}>Create task</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" className="sm:col-span-2" autoFocus placeholder="What needs to be done?" value={f.title} onChange={set("title")} />
        <Textarea label="Description" className="sm:col-span-2" placeholder="Add details, acceptance criteria, links…" value={f.description} onChange={set("description")} />
        <Select label="Project" value={f.projectId} onChange={set("projectId")}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.key} · {p.name}</option>)}
        </Select>
        <Select label="Assignee" value={f.assigneeId} onChange={set("assigneeId")}>
          <option value="">Unassigned</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.employeeId})</option>)}
        </Select>
        <Select label="Priority" value={f.priority} onChange={set("priority")}>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select label="Status" value={f.status} onChange={set("status")}>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{TASK_STATUS[s].label}</option>)}
        </Select>
        <Input label="Due date" type="date" value={f.dueDate} onChange={set("dueDate")} />
      </div>
    </Modal>
  );
}
