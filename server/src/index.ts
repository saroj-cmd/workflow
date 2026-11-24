import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./lib/http.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { usersRouter } from "./routes/users.js";
import { documentsRouter } from "./routes/documents.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { statsRouter } from "./routes/stats.js";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "1mb" }));

// Versioned REST API — shared by the web app and future mobile apps.
const api = express.Router();
api.get("/health", (_req, res) => res.json({ ok: true }));
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

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API ready on http://localhost:${port}/api/v1`));
