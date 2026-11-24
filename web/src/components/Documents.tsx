import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Trash2, Eye, ShieldCheck, XCircle, Clock, Plus, FileUp } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/api";
import { openProtectedFile } from "@/lib/hooks";
import { DOC_STATUS, DOC_TYPES, ago, bytes, docLabel, maskNumber } from "@/lib/format";
import type { Doc, DocType } from "@/lib/types";
import { Badge, Button, Dropzone, Input, Modal, Select, IconButton, Textarea } from "./ui";

const statusIcon = { PENDING: Clock, VERIFIED: ShieldCheck, REJECTED: XCircle };

export function DocumentCard({ doc, onDelete, onReview, canDelete }: {
  doc: Doc; canDelete?: boolean; onDelete?: () => void; onReview?: (status: "VERIFIED" | "REJECTED", note?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const st = DOC_STATUS[doc.status];
  const Icon = doc.mimeType.startsWith("image/") ? ImageIcon : FileText;
  const SIcon = statusIcon[doc.status];

  const view = () => openProtectedFile(`/documents/${doc.id}/file`).catch((e) => toast.error(e.message));
  const review = async (s: "VERIFIED" | "REJECTED") => {
    if (!onReview) return;
    setBusy(s);
    try { await onReview(s, note || undefined); setRejecting(false); setNote(""); } catch (e) { if ((e as Error).message !== "note") toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="card group relative overflow-hidden p-4 transition-shadow hover:shadow-lift">
      <div className={clsx("absolute inset-x-0 top-0 h-0.5", doc.status === "VERIFIED" ? "bg-success" : doc.status === "REJECTED" ? "bg-danger" : "bg-warning/70")} />
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold">{doc.label || docLabel(doc.type)}</p>
            <Badge tone={st.tone}><SIcon className="h-3 w-3" />{st.label}</Badge>
          </div>
          {doc.docNumber && <p className="mt-0.5 font-mono text-xs text-muted">{maskNumber(doc.docNumber)}</p>}
          <p className="mt-1 truncate text-xs text-muted">{doc.fileName} · {bytes(doc.size)} · {ago(doc.createdAt)}</p>
        </div>
      </div>
      {doc.reviewNote && doc.status === "REJECTED" && (
        <p className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">{doc.reviewNote}</p>
      )}
      <div className="mt-4 flex items-center gap-1.5">
        <Button size="sm" variant="secondary" icon={Eye} onClick={view}>View</Button>
        {onReview && doc.status !== "VERIFIED" && (
          <Button size="sm" variant="success" icon={ShieldCheck} loading={busy === "VERIFIED"} onClick={() => review("VERIFIED")}>Verify</Button>
        )}
        {onReview && doc.status !== "REJECTED" && (
          <Button size="sm" variant="ghost" className="hover:!text-danger" onClick={() => setRejecting((r) => !r)}>Reject</Button>
        )}
        {canDelete && onDelete && <IconButton icon={Trash2} label="Delete document" onClick={onDelete} className="ml-auto hover:!text-danger" />}
      </div>
      <AnimatePresence>
        {rejecting && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2">
              <Textarea placeholder="What's wrong? e.g. image is blurry" value={note} onChange={(e) => setNote(e.target.value)} className="[&_textarea]:min-h-[64px]" />
              <Button size="sm" variant="danger" loading={busy === "REJECTED"} onClick={() => review("REJECTED")}>Confirm rejection</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function UploadDocButton({ onUploaded, defaultType }: { onUploaded: (d: Doc) => void; defaultType?: DocType }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon={Plus} onClick={() => setOpen(true)}>Upload document</Button>
      <UploadDocModal open={open} onClose={() => setOpen(false)} onUploaded={onUploaded} defaultType={defaultType} />
    </>
  );
}

export function UploadDocModal({ open, onClose, onUploaded, defaultType = "AADHAAR" }: {
  open: boolean; onClose: () => void; onUploaded: (d: Doc) => void; defaultType?: DocType;
}) {
  const [type, setType] = useState<DocType>(defaultType);
  const [number, setNumber] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const meta = DOC_TYPES.find((d) => d.value === type)!;
  const showNumber = meta.isId;

  const reset = () => { setFile(null); setNumber(""); setLabel(""); };
  async function submit() {
    if (!file) return toast.error("Please choose a file");
    if (file.size > 4 * 1024 * 1024) return toast.error("File must be under 4 MB");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (number) fd.append("docNumber", number);
      if (label) fd.append("label", label);
      fd.append("file", file);
      const { document } = await api.post<{ document: Doc }>("/documents", fd);
      toast.success(`${docLabel(type)} uploaded`);
      onUploaded(document);
      reset();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload a document" description="PDF, JPG or PNG, up to 4 MB. Only you and admins can see it."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} icon={FileUp} onClick={submit}>Upload</Button></>}>
      <div className="space-y-4">
        <Select label="Document type" value={type} onChange={(e) => setType(e.target.value as DocType)}>
          {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </Select>
        {showNumber && (
          <Input label={`${meta.label} number`} hint={meta.hint ?? "Optional"} placeholder={meta.hint} value={number} onChange={(e) => setNumber(e.target.value)} />
        )}
        {type === "OTHER" && <Input label="What is this document?" placeholder="e.g. Experience letter" value={label} onChange={(e) => setLabel(e.target.value)} />}
        {file ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><FileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted">{bytes(file.size)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>Change</Button>
          </motion.div>
        ) : (
          <Dropzone onFile={setFile} accept="application/pdf,image/jpeg,image/png,image/webp" hint="PDF, JPG, PNG · max 4 MB" />
        )}
      </div>
    </Modal>
  );
}

export function useDocDelete(setDocs: (fn: (d: Doc[]) => Doc[]) => void) {
  return async (doc: Doc) => {
    if (!confirm(`Delete "${doc.label || docLabel(doc.type)}"? This can't be undone.`)) return;
    try {
      await api.del(`/documents/${doc.id}`);
      setDocs((ds) => ds.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
}
