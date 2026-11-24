import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, FileText, Send, Hourglass, AlertTriangle, UserCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useApi, bustFileCache } from "@/lib/hooks";
import { DOC_TYPES } from "@/lib/format";
import type { Doc, User } from "@/lib/types";
import { Button, PageHeader, Skeleton, EmptyState, stagger } from "@/components/ui";
import { IdCard } from "@/components/IdCard";
import { DocumentCard, UploadDocButton, useDocDelete } from "@/components/Documents";

export function Onboarding() {
  const { user, setUser } = useAuth();
  const { data, setData, loading } = useApi<{ documents: Doc[] }>("/documents");
  const docs = data?.documents ?? [];
  const setDocs = (fn: (d: Doc[]) => Doc[]) => setData((p) => ({ documents: fn(p?.documents ?? []) }));
  const del = useDocDelete(setDocs);
  const [submitting, setSubmitting] = useState(false);
  const [photoV, setPhotoV] = useState(0);
  if (!user) return null;

  const hasPhoto = user.hasPhoto;
  const hasProfile = !!(user.phone && user.address && user.dateOfBirth);
  const hasId = docs.some((d) => DOC_TYPES.find((t) => t.value === d.type)?.isId);
  const editable = user.status === "DRAFT" || user.status === "REJECTED";
  const steps = [
    { done: hasPhoto, title: "Add your photo", text: "Used on your employee ID." },
    { done: hasProfile, title: "Complete your profile", text: "Phone, date of birth and address." },
    { done: hasId, title: "Upload an ID proof", text: "Aadhaar, PAN, passport or similar." },
    { done: user.status === "PENDING", title: "Submit for review", text: "An admin will verify your details." },
  ];

  async function uploadPhoto(f?: File) {
    if (!f) return;
    const fd = new FormData();
    fd.append("photo", f);
    try {
      const { user: u } = await api.post<{ user: User }>("/me/photo", fd);
      bustFileCache(`/users/${u.id}/photo`);
      setPhotoV(Date.now());
      setUser(u);
      toast.success("Photo updated");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const { user: u } = await api.post<{ user: User }>("/me/submit");
      setUser(u);
      toast.success("Application submitted", { description: "We'll notify you once it's reviewed." });
    } catch (e) { toast.error((e as Error).message); } finally { setSubmitting(false); }
  }

  return (
    <>
      <PageHeader eyebrow="Onboarding" title={`Hi ${user.name.split(" ")[0]}, let's get you set up`}
        subtitle="Complete these steps and submit your application. Once approved, you'll get access to your work board." />

      <AnimatePresence>
        {user.status === "PENDING" && (
          <Banner key="p" tone="warning" icon={Hourglass} title="Your application is under review"
            text="An admin is checking your details and documents. You'll get access to your work board once you're approved." />
        )}
        {user.status === "REJECTED" && (
          <Banner key="r" tone="danger" icon={AlertTriangle} title="Changes needed"
            text={user.reviewNote || "Please update your details and resubmit."} />
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <IdCard user={user} photoVersion={photoV} />
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="card p-2">
            {steps.map((s, i) => (
              <motion.div key={i} variants={stagger.item} className="flex items-center gap-4 rounded-xl p-3">
                <div className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-all",
                  s.done ? "bg-success text-white shadow-[0_4px_14px_-4px_rgb(var(--success)/0.7)]" : "bg-surface-2 text-muted ring-1 ring-border")}>
                  {s.done ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-4 w-4" strokeWidth={3} /></motion.span> : i + 1}
                </div>
                <div>
                  <p className={clsx("text-sm font-bold", s.done && "text-muted line-through decoration-2")}>{s.title}</p>
                  <p className="text-xs text-muted">{s.text}</p>
                </div>
              </motion.div>
            ))}
            {editable && (
              <div className="p-3 pt-1">
                <Button className="w-full" size="lg" icon={Send} loading={submitting} disabled={!hasPhoto || !hasId} onClick={submit}>
                  {user.status === "REJECTED" ? "Resubmit application" : "Submit application"}
                </Button>
                {(!hasPhoto || !hasId) && <p className="mt-2 text-center text-xs text-muted">Add a photo and at least one ID proof to submit.</p>}
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="card group flex cursor-pointer items-center gap-4 p-5 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand transition group-hover:scale-105"><Camera className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="font-bold">{hasPhoto ? "Change photo" : "Upload photo"}</p>
                <p className="text-xs text-muted">JPG or PNG, up to 4 MB</p>
              </div>
              {hasPhoto && <Check className="h-5 w-5 text-success" />}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
            </label>
            <Link to="/profile" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand transition group-hover:scale-105"><UserCircle className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="font-bold">Profile details</p>
                <p className="text-xs text-muted">{hasProfile ? "All set" : "Phone, date of birth, address"}</p>
              </div>
              {hasProfile ? <Check className="h-5 w-5 text-success" /> : <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1" />}
            </Link>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Your documents</h2>
                <p className="text-sm text-muted">Upload Aadhaar, PAN or any other documents you've been asked for.</p>
              </div>
              <UploadDocButton onUploaded={(d) => setDocs((ds) => [d, ...ds])} />
            </div>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
            ) : docs.length === 0 ? (
              <EmptyState icon={FileText} title="No documents yet" text="Start with your Aadhaar or PAN card — they're needed to verify your identity." />
            ) : (
              <motion.div layout className="grid gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {docs.map((d) => <DocumentCard key={d.id} doc={d} canDelete={d.status !== "VERIFIED"} onDelete={() => del(d)} />)}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Banner({ tone, icon: Icon, title, text }: { tone: "warning" | "danger"; icon: typeof Hourglass; title: string; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className={clsx("mb-6 flex items-start gap-3 rounded-2xl border p-4", tone === "warning" ? "border-warning/30 bg-warning/5" : "border-danger/30 bg-danger/5")}>
        <div className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white", tone === "warning" ? "bg-warning" : "bg-danger")}><Icon className="h-[18px] w-[18px]" /></div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
