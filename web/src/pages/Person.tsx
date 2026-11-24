import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Ban, RotateCcw, Shield, Trash2, Mail, Phone, MapPin, Cake, Briefcase, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { ROLE_LABEL, USER_STATUS, ago, date } from "@/lib/format";
import type { Doc, User } from "@/lib/types";
import { Button, EmptyState, Skeleton, Textarea } from "@/components/ui";
import { IdCard } from "@/components/IdCard";
import { DocumentCard, useDocDelete } from "@/components/Documents";

export function PersonPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { data, setData, loading, error } = useApi<{ user: User; documents: Doc[] }>(`/users/${id}`);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  if (error) return <EmptyState icon={XCircle} title="Couldn't load this person" text={error} action={<Link to="/people"><Button variant="secondary">Back to people</Button></Link>} />;
  if (loading || !data) return <div className="grid gap-6 xl:grid-cols-[420px_1fr]"><Skeleton className="h-60" /><Skeleton className="h-96" /></div>;

  const { user, documents } = data;
  const setDocs = (fn: (d: Doc[]) => Doc[]) => setData((p) => p && { ...p, documents: fn(p.documents) });
  const del = useDocDelete(setDocs);
  const isSuper = me?.role === "SUPER_ADMIN";
  const canManage = user.id !== me?.id && user.role !== "SUPER_ADMIN" && (user.role === "EMPLOYEE" || isSuper);
  const verified = documents.filter((d) => d.status === "VERIFIED").length;

  async function review(status: "APPROVED" | "REJECTED" | "SUSPENDED" | "PENDING") {
    setBusy(status);
    try {
      const { user: u } = await api.post<{ user: User }>(`/users/${user.id}/review`, { status, note: note || undefined });
      setData((p) => p && { ...p, user: { ...p.user, ...u } });
      setRejecting(false); setNote("");
      toast.success({ APPROVED: `${u.name} approved 🎉`, REJECTED: "Sent back for changes", SUSPENDED: "Account suspended", PENDING: "Moved back to review" }[status]);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function setRole(role: "ADMIN" | "EMPLOYEE") {
    if (!confirm(role === "ADMIN" ? `Make ${user.name} an admin? They'll be able to review people and assign work.` : `Remove admin access from ${user.name}?`)) return;
    setBusy("role");
    try {
      const { user: u } = await api.post<{ user: User }>(`/users/${user.id}/role`, { role });
      setData((p) => p && { ...p, user: { ...p.user, ...u } });
      toast.success(`${u.name} is now ${ROLE_LABEL[u.role].toLowerCase()}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function remove() {
    if (!confirm(`Permanently delete ${user.name} and all their documents? This can't be undone.`)) return;
    try { await api.del(`/users/${user.id}`); toast.success("Deleted"); navigate("/people"); } catch (e) { toast.error((e as Error).message); }
  }
  async function reviewDoc(doc: Doc, status: "VERIFIED" | "REJECTED", n?: string) {
    if (status === "REJECTED" && !n) { toast.error("Add a note so they know what to fix"); throw new Error("note"); }
    const { document } = await api.post<{ document: Doc }>(`/documents/${doc.id}/review`, { status, note: n });
    setDocs((ds) => ds.map((d) => (d.id === doc.id ? document : d)));
    toast.success(status === "VERIFIED" ? "Document verified" : "Document rejected");
  }

  const details = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Phone", value: user.phone },
    { icon: Cake, label: "Date of birth", value: user.dateOfBirth && date(user.dateOfBirth) },
    { icon: Briefcase, label: "Department", value: user.department },
    { icon: MapPin, label: "Address", value: user.address },
  ];

  return (
    <>
      <Link to="/people" className="group mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" /> People
      </Link>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <IdCard user={user} />

          {canManage && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <h3 className="font-bold">Application</h3>
              <p className="mt-0.5 text-sm text-muted">
                {USER_STATUS[user.status].label}{user.submittedAt && ` · submitted ${ago(user.submittedAt)}`}
              </p>
              {user.reviewNote && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">“{user.reviewNote}”</p>}
              {user.role === "EMPLOYEE" && user.status === "PENDING" && (
                <p className="mt-3 text-xs text-muted">{verified} of {documents.length} documents verified</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {user.status !== "APPROVED" && user.status !== "SUSPENDED" && (
                  <Button variant="success" icon={CheckCircle2} loading={busy === "APPROVED"} onClick={() => review("APPROVED")}>Approve</Button>
                )}
                {(user.status === "PENDING" || user.status === "DRAFT") && (
                  <Button variant="secondary" icon={XCircle} onClick={() => setRejecting((r) => !r)}>Request changes</Button>
                )}
                {user.status === "APPROVED" && (
                  <Button variant="secondary" icon={Ban} className="hover:!text-danger" loading={busy === "SUSPENDED"} onClick={() => confirm(`Suspend ${user.name}? They won't be able to sign in.`) && review("SUSPENDED")}>Suspend</Button>
                )}
                {user.status === "SUSPENDED" && (
                  <Button variant="secondary" icon={RotateCcw} loading={busy === "APPROVED"} onClick={() => review("APPROVED")}>Reactivate</Button>
                )}
              </div>
              <AnimatePresence>
                {rejecting && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 space-y-2">
                      <Textarea label="What needs to change?" placeholder="e.g. Please re-upload a clearer copy of your PAN card." value={note} onChange={(e) => setNote(e.target.value)} />
                      <Button variant="danger" loading={busy === "REJECTED"} disabled={!note.trim()} onClick={() => review("REJECTED")}>Send back to employee</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {isSuper && user.role !== "SUPER_ADMIN" && (
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-bold"><Shield className="h-4 w-4 text-brand" /> Super admin controls</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {user.role === "EMPLOYEE"
                  ? <Button variant="secondary" loading={busy === "role"} onClick={() => setRole("ADMIN")}>Make admin</Button>
                  : <Button variant="secondary" loading={busy === "role"} onClick={() => setRole("EMPLOYEE")}>Remove admin access</Button>}
                <Button variant="ghost" icon={Trash2} className="hover:!text-danger" onClick={remove}>Delete</Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><d.icon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted">{d.label}</dt>
                    <dd className="break-words text-sm font-semibold">{d.value || <span className="font-normal text-muted">Not provided</span>}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">Documents</h2>
              <p className="text-sm text-muted">{documents.length ? `${verified} of ${documents.length} verified` : "Nothing uploaded yet"}</p>
            </div>
            {documents.length === 0 ? (
              <EmptyState icon={FileText} title="No documents" text="This person hasn't uploaded any documents yet." />
            ) : (
              <motion.div layout className="grid gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {documents.map((d) => (
                    <DocumentCard key={d.id} doc={d} canDelete onDelete={() => del(d)}
                      onReview={user.id !== me?.id ? (s, n) => reviewDoc(d, s, n) : undefined} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
