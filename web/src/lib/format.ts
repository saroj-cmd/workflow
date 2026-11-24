import { formatDistanceToNowStrict, format, isPast, isToday } from "date-fns";
import type { DocType, DocStatus, Priority, Role, TaskStatus, UserStatus } from "./types";

export const ago = (d: string) => formatDistanceToNowStrict(new Date(d), { addSuffix: true });
export const date = (d: string) => format(new Date(d), "d MMM yyyy");
export const shortDate = (d: string) => format(new Date(d), "d MMM");
export const isOverdue = (d: string | null) => !!d && isPast(new Date(d)) && !isToday(new Date(d));
export const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
export const maskNumber = (n: string | null) => (n && n.length > 4 ? "•••• " + n.slice(-4) : n ?? "");

export const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: "Super admin", ADMIN: "Admin", EMPLOYEE: "Employee" };

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export const USER_STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Not submitted", tone: "neutral" },
  PENDING: { label: "Under review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Changes needed", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};
export const DOC_STATUS: Record<DocStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Awaiting review", tone: "warning" },
  VERIFIED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};
export const DOC_TYPES: { value: DocType; label: string; hint?: string; isId?: boolean }[] = [
  { value: "AADHAAR", label: "Aadhaar card", hint: "12-digit number", isId: true },
  { value: "PAN", label: "PAN card", hint: "e.g. ABCDE1234F", isId: true },
  { value: "PASSPORT", label: "Passport", isId: true },
  { value: "DRIVING_LICENSE", label: "Driving licence", isId: true },
  { value: "VOTER_ID", label: "Voter ID", isId: true },
  { value: "RESUME", label: "Resume / CV" },
  { value: "EDUCATION", label: "Education certificate" },
  { value: "OFFER_LETTER", label: "Offer letter" },
  { value: "OTHER", label: "Other" },
];
export const docLabel = (t: DocType) => DOC_TYPES.find((d) => d.value === t)?.label ?? t;

export const TASK_STATUS: Record<TaskStatus, { label: string; color: string }> = {
  TODO: { label: "To do", color: "rgb(var(--muted))" },
  IN_PROGRESS: { label: "In progress", color: "rgb(var(--info))" },
  IN_REVIEW: { label: "In review", color: "rgb(var(--warning))" },
  DONE: { label: "Done", color: "rgb(var(--success))" },
};
export const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

export function describeActivity(a: { action: string; meta: Record<string, string | null> | null }) {
  const m = a.meta ?? {};
  switch (a.action) {
    case "created": return "created this task";
    case "status": return `moved it to ${TASK_STATUS[m.to as TaskStatus]?.label ?? m.to}`;
    case "assigned": return m.to ? `assigned it to ${m.to}` : "unassigned it";
    case "priority": return `set priority to ${PRIORITY[m.to as Priority]?.label ?? m.to}`;
    case "commented": return "commented";
    case "attached": return `attached ${m.file}`;
    case "edited": return "edited the details";
    default: return a.action;
  }
}
