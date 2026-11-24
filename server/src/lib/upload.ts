import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { HttpError } from "./http.js";

export const UPLOAD_ROOT = path.resolve("uploads");

const DOC_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const ATTACH_MIME = [
  ...DOC_MIME, "image/gif", "text/plain", "text/csv", "application/zip",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Local disk storage for now; swap for S3/Cloud storage in production.
function makeUploader(folder: string, allowed: string[], maxMb: number) {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (_req, file, cb) =>
        cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0, 10)}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      allowed.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, "This file type isn't allowed")),
  });
}

export const photoUpload = makeUploader("photos", IMAGE_MIME, 5);
export const documentUpload = makeUploader("documents", DOC_MIME, 10);
export const attachmentUpload = makeUploader("attachments", ATTACH_MIME, 20);

export const relPath = (absolute: string) => path.relative(UPLOAD_ROOT, absolute);
export const absPath = (relative: string) => {
  const p = path.resolve(UPLOAD_ROOT, relative);
  if (!p.startsWith(UPLOAD_ROOT + path.sep)) throw new HttpError(400, "Bad path");
  return p;
};
export const removeFile = (relative?: string | null) => {
  if (relative) fs.promises.unlink(absPath(relative)).catch(() => {});
};
