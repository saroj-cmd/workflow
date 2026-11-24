import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderKanban, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Project } from "@/lib/types";
import { Button, EmptyState, Input, Modal, PageHeader, Skeleton, Textarea, stagger } from "@/components/ui";

const COLORS = ["#635bff", "#d946ef", "#10a36e", "#f59e0b", "#0e8ce9", "#e13652", "#14b8a6", "#8b5cf6"];

export function ProjectsPage() {
  const { data, setData, loading } = useApi<{ projects: Project[] }>("/projects");
  const [open, setOpen] = useState(false);
  const projects = data?.projects ?? [];
  return (
    <>
      <PageHeader eyebrow="Work" title="Projects" subtitle="Group related work. Each task gets a key like OPS-12."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New project</Button>} />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : projects.length === 0 ? (
        <div className="card"><EmptyState icon={FolderKanban} title="No projects yet" text="Create a project like “Operations” or “HR” to start assigning work."
          action={<Button icon={Plus} onClick={() => setOpen(true)}>Create project</Button>} /></div>
      ) : (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const pct = p.taskCount ? p.doneCount / p.taskCount : 0;
            return (
              <motion.div key={p.id} variants={stagger.item} whileHover={{ y: -4 }}>
                <Link to={`/tasks`} className="card group relative block overflow-hidden p-6 transition-shadow hover:shadow-lift">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: p.color }} />
                  <div className="relative flex items-start justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl font-mono text-sm font-bold text-white shadow-md" style={{ background: p.color }}>{p.key.slice(0, 3)}</div>
                    <ArrowUpRight className="h-5 w-5 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </div>
                  <h3 className="relative mt-4 text-lg font-bold">{p.name}</h3>
                  <p className="relative mt-1 line-clamp-2 min-h-[40px] text-sm text-muted">{p.description || "No description"}</p>
                  <div className="relative mt-5">
                    <div className="mb-1.5 flex justify-between text-xs font-semibold"><span className="text-muted">{p.doneCount}/{p.taskCount} done</span><span>{Math.round(pct * 100)}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.div className="h-full rounded-full" style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      <CreateProject open={open} onClose={() => setOpen(false)} onCreated={(p) => setData((d) => ({ projects: [...(d?.projects ?? []), { ...p, taskCount: 0, doneCount: 0 }] }))} />
    </>
  );
}

function CreateProject({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Project) => void }) {
  const [f, setF] = useState({ name: "", key: "", description: "", color: COLORS[0] });
  const [keyTouched, setKeyTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoKey = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || name.slice(0, 3).toUpperCase();
  async function submit() {
    setBusy(true);
    try {
      const { project } = await api.post<{ project: Project }>("/projects", { ...f, description: f.description || undefined });
      toast.success(`Project ${project.key} created`);
      onCreated(project);
      setF({ name: "", key: "", description: "", color: COLORS[0] }); setKeyTouched(false);
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="New project" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Create project</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Input label="Name" autoFocus placeholder="e.g. Operations" value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value, key: keyTouched ? f.key : autoKey(e.target.value) })} />
          <Input label="Key" placeholder="OPS" className="[&_input]:font-mono [&_input]:uppercase" value={f.key} maxLength={6}
            onChange={(e) => { setKeyTouched(true); setF({ ...f, key: e.target.value.toUpperCase() }); }} />
        </div>
        <Textarea label="Description" placeholder="What is this project about?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div>
          <p className="label">Colour</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setF({ ...f, color: c })} aria-label={`Colour ${c}`}
                className={clsx("h-8 w-8 rounded-full transition", f.color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-surface" : "hover:scale-110")}
                style={{ background: c, ["--tw-ring-color" as string]: c }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
