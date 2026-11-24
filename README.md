# Workflow — People & Work

Employee onboarding (profile, photo, ID documents, generated employee ID, admin approval) plus a Jira-style work board (projects, tasks, drag-and-drop, comments, file attachments, activity log).

```
server/   REST API — Node, Express, TypeScript, Prisma + Postgres
web/      Web app — React, Vite, Tailwind, Framer Motion
api/      Vercel serverless entry (serves the same Express app)
```

The API is the single backend for the web app **and the future mobile apps**: versioned at `/api/v1`, stateless Bearer-token (JWT) auth, JSON in/out, multipart for uploads. Nothing is web-only.

**Hosting:** see [DEPLOY.md](DEPLOY.md) for the free Supabase (database + file storage) + Vercel (website + API) setup.

## Run locally

The app needs a Postgres database — the easiest is the free Supabase project from [DEPLOY.md](DEPLOY.md) (Part 1).

```bash
npm install                      # installs server + web (npm workspaces)
cp server/.env.example server/.env   # then fill in the values
npm run db:setup                 # creates tables, super admin and storage bucket
npm run dev:server               # API on http://localhost:4000
npm run dev:web                  # Web on http://localhost:5173
```

If `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are empty, uploads are saved to `server/uploads/` instead of Supabase Storage.

## Roles

| | Employee | Admin | Super admin |
|---|---|---|---|
| Register, upload photo & documents, submit application | ✅ | | |
| See / move own tasks, comment, attach files | ✅ | ✅ | ✅ |
| Review applications, verify documents | | ✅ | ✅ |
| Create projects & tasks, assign work | | ✅ | ✅ |
| Add employees | | ✅ | ✅ |
| Add admins, promote/demote, delete people | | | ✅ |

**Employee lifecycle:** `DRAFT` (registered, gets ID like `EMP-2026-0001`) → `PENDING` (submitted with photo + at least one ID proof) → `APPROVED` (gets the work board) or `REJECTED` (with a note; can fix and resubmit). Admins can `SUSPEND`. Only approved people can be assigned work.

## API overview (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (multipart, optional `photo`), `POST /auth/login`, `GET /auth/me` |
| Me | `PATCH /me`, `POST /me/photo`, `POST /me/password`, `POST /me/submit` |
| People (staff) | `GET /users?status=&role=&q=`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/review`, `POST /users/:id/role` (super admin), `DELETE /users/:id` (super admin) |
| | `GET /users/directory`, `GET /users/:id/photo` |
| Documents | `GET /documents[?userId=]`, `POST /documents` (multipart `file`, `type`, `docNumber`), `GET /documents/:id/file`, `DELETE /documents/:id`, `POST /documents/:id/review` (staff) |
| Projects | `GET /projects`, `POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id` |
| Tasks | `GET /tasks?projectId=&assigneeId=&status=&mine=1`, `POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks/:id/comments`, `POST /tasks/:id/attachments`, `GET/DELETE /tasks/:id/attachments/:attId` |
| Stats | `GET /stats` (role-aware dashboard numbers) |

Errors are always `{ "error": "Human readable message" }` with a proper HTTP status.

## Before production

- Uploads go through the API and are capped at 4 MB (Vercel limit). For bigger files, switch to signed direct-to-storage uploads (`server/src/lib/storage.ts`).
- Add refresh tokens, rate limiting on `/auth/*`, email verification and password reset.
- Add push/email notifications (assignment, approval) — needed for the mobile apps too.
