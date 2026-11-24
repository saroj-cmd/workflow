import { AnimatePresence, motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useApi } from "@/lib/hooks";
import type { Doc } from "@/lib/types";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui";
import { DocumentCard, UploadDocButton, useDocDelete } from "@/components/Documents";

export function DocumentsPage() {
  const { data, setData, loading } = useApi<{ documents: Doc[] }>("/documents");
  const docs = data?.documents ?? [];
  const setDocs = (fn: (d: Doc[]) => Doc[]) => setData((p) => ({ documents: fn(p?.documents ?? []) }));
  const del = useDocDelete(setDocs);
  const verified = docs.filter((d) => d.status === "VERIFIED").length;
  return (
    <>
      <PageHeader eyebrow="Documents" title="My documents"
        subtitle={docs.length ? `${verified} of ${docs.length} verified · only you and admins can see these` : "Keep your ID proofs and certificates in one secure place."}
        actions={<UploadDocButton onUploaded={(d) => setDocs((ds) => [d, ...ds])} />} />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : docs.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title="No documents yet" text="Upload your Aadhaar, PAN, certificates or anything HR has asked for." /></div>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>{docs.map((d) => <DocumentCard key={d.id} doc={d} canDelete={d.status !== "VERIFIED"} onDelete={() => del(d)} />)}</AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
