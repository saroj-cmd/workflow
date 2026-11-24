export const ROLES = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];
export const USER_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export const DOC_TYPES = ["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE", "VOTER_ID", "RESUME", "EDUCATION", "OFFER_LETTER", "OTHER"] as const;
export const DOC_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const isStaff = (role: string) => role === "ADMIN" || role === "SUPER_ADMIN";
