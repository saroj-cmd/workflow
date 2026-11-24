export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
export type UserStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type DocType = "AADHAAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | "VOTER_ID" | "RESUME" | "EDUCATION" | "OFFER_LETTER" | "OTHER";
export type DocStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  hasPhoto: boolean;
  department: string | null;
  designation: string | null;
  dateOfBirth: string | null;
  address: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  createdAt: string;
  counts?: { documents: number; assigned: number };
}
export interface Person { id: string; name: string; employeeId: string; hasPhoto: boolean; role?: Role; designation?: string | null }

export interface Doc {
  id: string;
  userId: string;
  type: DocType;
  label: string | null;
  docNumber: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  status: DocStatus;
  reviewNote: string | null;
  createdAt: string;
}

export interface Project {
  id: string; key: string; name: string; description: string | null; color: string;
  taskCount: number; doneCount: number;
}

export interface Task {
  id: string; key: string; title: string; description: string | null;
  status: TaskStatus; priority: Priority; position: number;
  dueDate: string | null; createdAt: string; updatedAt: string;
  assignee: Person | null;
  project: { id: string; key: string; name: string; color: string };
  _count: { comments: number; attachments: number };
}
export interface Comment { id: string; body: string; createdAt: string; author: Person }
export interface Attachment { id: string; fileName: string; mimeType: string; size: number; createdAt: string; uploader: { id: string; name: string } }
export interface Activity {
  id: string; action: string; meta: Record<string, string | null> | null; createdAt: string;
  actor: { id: string; name: string }; task?: { id: string; key: string; title: string };
}
export interface TaskDetail extends Task { reporter: Person; comments: Comment[]; attachments: Attachment[]; activities: Activity[] }
