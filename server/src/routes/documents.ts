import { Router } from "express";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ah, HttpError, notFound, forbidden } from "../lib/http.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { documentUpload, relPath, absPath, removeFile } from "../lib/upload.js";
import { DOC_TYPES, isStaff } from "../lib/constants.js";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const canSee = (me: Express.Request["user"], ownerId: string) => me!.id === ownerId || isStaff(me!.role);

// GET /documents -> my documents; ?userId= (staff) -> someone else's.
documentsRouter.get(
  "/",
  ah(async (req, res) => {
    const userId = (req.query.userId as string) || req.user!.id;
    if (!canSee(req.user, userId)) throw forbidden();
    const documents = await prisma.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.json({ documents });
  })
);

documentsRouter.post(
  "/",
  documentUpload.single("file"),
  ah(async (req, res) => {
    try {
      if (!req.file) throw new HttpError(400, "Please choose a file");
      const data = z
        .object({
          type: z.enum(DOC_TYPES),
          label: z.string().trim().max(80).optional(),
          docNumber: z.string().trim().max(40).optional(),
        })
        .parse(req.body);
      if (data.type === "AADHAAR" && data.docNumber && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(data.docNumber))
        throw new HttpError(400, "Aadhaar number must be 12 digits");
      if (data.type === "PAN" && data.docNumber && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(data.docNumber))
        throw new HttpError(400, "PAN must look like ABCDE1234F");
      const doc = await prisma.document.create({
        data: {
          ...data,
          docNumber: data.docNumber?.toUpperCase().replace(/\s/g, "") || null,
          userId: req.user!.id,
          fileName: req.file.originalname,
          filePath: relPath(req.file.path),
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      });
      res.status(201).json({ document: doc });
    } catch (e) {
      if (req.file) removeFile(relPath(req.file.path));
      throw e;
    }
  })
);

documentsRouter.get(
  "/:id/file",
  ah(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound("Document");
    if (!canSee(req.user, doc.userId)) throw forbidden();
    const file = absPath(doc.filePath);
    if (!fs.existsSync(file)) throw notFound("File");
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(file);
  })
);

documentsRouter.delete(
  "/:id",
  ah(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound("Document");
    const me = req.user!;
    if (!isStaff(me.role)) {
      if (doc.userId !== me.id) throw forbidden();
      if (doc.status === "VERIFIED") throw new HttpError(400, "Verified documents can't be deleted");
    }
    await prisma.document.delete({ where: { id: doc.id } });
    removeFile(doc.filePath);
    res.json({ ok: true });
  })
);

documentsRouter.post(
  "/:id/review",
  requireRole("ADMIN", "SUPER_ADMIN"),
  ah(async (req, res) => {
    const { status, note } = z
      .object({ status: z.enum(["VERIFIED", "REJECTED", "PENDING"]), note: z.string().trim().max(300).optional() })
      .parse(req.body);
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound("Document");
    if (doc.userId === req.user!.id) throw new HttpError(400, "You can't verify your own documents");
    const document = await prisma.document.update({
      where: { id: doc.id },
      data: { status, reviewNote: note || null, reviewedById: req.user!.id, reviewedAt: new Date() },
    });
    res.json({ document });
  })
);
