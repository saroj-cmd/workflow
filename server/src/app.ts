import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./lib/http.js";
import { storageMode } from "./lib/storage.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { usersRouter } from "./routes/users.js";
import { documentsRouter } from "./routes/documents.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { statsRouter } from "./routes/stats.js";

// The Express app, shared by the local server (src/index.ts) and the Vercel function (api/index.ts).
export const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
// On Vercel the web app and API share one domain, so CORS only matters for other clients (e.g. local dev, mobile).
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "1mb" }));

// Versioned REST API — shared by the web app and future mobile apps.
const REQUIRED_ENV = ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET"];
const missingEnv = () => REQUIRED_ENV.filter((k) => !process.env[k]);

const api = express.Router();
api.get("/health", (_req, res) => {
  const missing = missingEnv();
  res.status(missing.length ? 503 : 200).json({ ok: !missing.length, storage: storageMode, missing });
});
// If the server is misconfigured (e.g. env vars not set on Vercel), say so clearly.
api.use((_req, res, next) => {
  const missing = missingEnv();
  if (missing.length) return res.status(503).json({ error: `Server is missing settings: ${missing.join(", ")}` });
  next();
});
api.use("/auth", authRouter);
api.use("/me", meRouter);
api.use("/users", usersRouter);
api.use("/documents", documentsRouter);
api.use("/projects", projectsRouter);
api.use("/tasks", tasksRouter);
api.use("/stats", statsRouter);
api.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use("/api/v1", api);
app.use(errorHandler);

export default app;
