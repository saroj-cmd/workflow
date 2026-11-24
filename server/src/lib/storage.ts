import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { HttpError, notFound } from "./http.js";

/*
 * File storage.
 * - If SUPABASE_URL + SUPABASE_SERVICE_KEY are set, files go to a PRIVATE Supabase Storage bucket.
 * - Otherwise they're written to ./uploads on local disk (local development only).
 * Files are never served publicly: every download goes through the API's permission checks.
 */

// Vercel rejects request bodies over ~4.5 MB, so keep uploads under that everywhere.
export const MAX_UPLOAD_MB = 4;

const DOC_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const ATTACH_MIME = [
  ...DOC_MIME, "image/gif", "text/plain", "text/csv", "application/zip",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const makeUploader = (allowed: string[]) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      allowed.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, "This file type isn't allowed")),
  });

export const photoUpload = makeUploader(IMAGE_MIME);
export const documentUpload = makeUploader(DOC_MIME);
export const attachmentUpload = makeUploader(ATTACH_MIME);

type Folder = "photos" | "documents" | "attachments";

interface Driver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

const LOCAL_ROOT = path.resolve("uploads");
const localDriver: Driver = {
  async put(key, data) {
    const file = localPath(key);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, data);
  },
  async get(key) {
    return fs.promises.readFile(localPath(key)).catch(() => null);
  },
  async remove(key) {
    await fs.promises.unlink(localPath(key)).catch(() => {});
  },
};
function localPath(key: string) {
  const p = path.resolve(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new HttpError(400, "Bad path");
  return p;
}

export const BUCKET = process.env.SUPABASE_BUCKET || "workflow-files";
export const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

const supabaseDriver = (client: NonNullable<typeof supabase>): Driver => ({
  async put(key, data, contentType) {
    const { error } = await client.storage.from(BUCKET).upload(key, data, { contentType, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  },
  async get(key) {
    const { data, error } = await client.storage.from(BUCKET).download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
  async remove(key) {
    await client.storage.from(BUCKET).remove([key]);
  },
});

const driver: Driver = supabase ? supabaseDriver(supabase) : localDriver;
export const storageMode = supabase ? "supabase" : "local";

/** Saves an uploaded file and returns its storage key, e.g. "documents/1b2c….pdf". */
export async function saveFile(folder: Folder, file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const key = `${folder}/${crypto.randomUUID()}${ext}`;
  await driver.put(key, file.buffer, file.mimetype);
  return key;
}

export function removeFile(key?: string | null) {
  if (key) driver.remove(key).catch(() => {});
}

export async function sendFile(
  res: Response,
  key: string,
  opts: { contentType: string; fileName?: string; cache?: string }
) {
  const data = await driver.get(key);
  if (!data) throw notFound("File");
  res.setHeader("Content-Type", opts.contentType);
  res.setHeader("Cache-Control", opts.cache ?? "private, no-store");
  if (opts.fileName) res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(opts.fileName)}"`);
  res.send(data);
}
