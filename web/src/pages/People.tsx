import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, UserPlus, Users, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { ROLE_LABEL, USER_STATUS, date } from "@/lib/format";
import type { User, UserStatus } from "@/lib/types";
import { Avatar, Badge, Button, EmptyState, Input, Modal, PageHeader, Select, Skeleton } from "@/components/ui";

const TABS: { value: UserStatus | ""; label: string }[] = [
  { value: "", label: "Everyone" }, { value: "PENDING", label: "To review" }, { value: "APPROVED", label: "Approved" },
  { value: "DRAFT", label: "Not submitted" }, { value: "REJECTED", label: "Changes needed" }, { value: "SUSPENDED", label: "Suspended" },
];

export function PeoplePage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as UserStatus | "";
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const { data, loading, reload } = useApi<{ users: User[] }>(`/users${qs({ status, q: q.trim() || undefined })}`);
  const users = data?.users ?? [];

  return (
    <>
      <PageHeader eyebrow="People" title="People" subtitle="Review applications, verify documents and manage your team."
        actions={<Button icon={UserPlus} onClick={() => setAdding(true)}>Add person</Button>} />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setParams(t.value ? { status: t.value } : {}, { replace: true })}
              className={clsx("relative whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition", status === t.value ? "text-fg" : "text-muted hover:text-fg")}>
              {status === t.value && <motion.span layoutId="people-tab" className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Name, email or employee ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No one here" text={status === "PENDING" ? "No applications are waiting for review. 🎉" : "Try a different filter or search."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Person</th><th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th><th className="px-5 py-3">Documents</th><th className="px-5 py-3">Joined</th><th />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.3) }}
                    onClick={() => navigate(`/people/${u.id}`)} className="group cursor-pointer border-b border-border last:border-0 transition hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size={38} />
                        <div className="min-w-0">
                          <p className="truncate font-bold group-hover:text-brand">{u.name}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{u.employeeId}</td>
                    <td className="px-5 py-3"><Badge tone={u.role === "EMPLOYEE" ? "neutral" : "brand"}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="px-5 py-3"><Badge tone={USER_STATUS[u.status].tone} dot>{USER_STATUS[u.status].label}</Badge></td>
                    <td className="px-5 py-3 text-muted"><span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{u.counts?.documents ?? 0}</span></td>
                    <td className="px-5 py-3 text-muted">{date(u.createdAt)}</td>
                    <td className="px-5 py-3"><ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-1" /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddPerson open={adding} onClose={() => setAdding(false)} onDone={reload} />
    </>
  );
}

function AddPerson({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", designation: "" });
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const { user: u } = await api.post<{ user: User }>("/users", { ...f, department: f.department || undefined, designation: f.designation || undefined });
      toast.success(`${u.name} added`, { description: `Employee ID ${u.employeeId}. Share the temporary password with them.` });
      setF({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", designation: "" });
      onDone(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="Add a person" description="They'll get an employee ID straight away and can sign in with this password."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} icon={UserPlus} onClick={submit}>Add person</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" className="sm:col-span-2" value={f.name} onChange={set("name")} autoFocus />
        <Input label="Email" type="email" value={f.email} onChange={set("email")} />
        <Input label="Temporary password" type="text" hint="At least 8 characters" value={f.password} onChange={set("password")} />
        <Input label="Department" value={f.department} onChange={set("department")} />
        <Input label="Designation" value={f.designation} onChange={set("designation")} />
        <Select label="Role" className="sm:col-span-2" value={f.role} onChange={set("role")}
          hint={user?.role !== "SUPER_ADMIN" ? "Only a super admin can add admins." : "Admins are approved automatically."}>
          <option value="EMPLOYEE">Employee</option>
          {user?.role === "SUPER_ADMIN" && <option value="ADMIN">Admin</option>}
        </Select>
      </div>
    </Modal>
  );
}
