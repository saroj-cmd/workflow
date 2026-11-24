# Free demo hosting: Supabase + Vercel

```
Browser ──► Vercel (your-app.vercel.app)
              ├─ website       (web/ → static files)
              └─ /api/*        (api/index.ts → Express API)
                     ├─► Supabase Postgres   (all data)
                     └─► Supabase Storage    (photos, documents, attachments — private bucket)
```

Both services are free and need no credit card. Takes about 15 minutes.

---

## Part 1 — Supabase (database + file storage)

### 1. Create the project
1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**:
   - **Name:** `workflow`
   - **Database password:** click **Generate a password** and **save it somewhere safe** — you need it in step 2.
   - **Region:** pick the one closest to your users (e.g. **Mumbai / ap-south-1** for India).
3. Click **Create new project** and wait ~2 minutes until it's ready.

### 2. Copy the database connection strings
1. Click the **Connect** button at the top of the project dashboard.
2. Under **Connection String**, find these two entries (choose type **URI**):

| Supabase calls it | Port | Goes into |
|---|---|---|
| **Transaction pooler** | `6543` | `DATABASE_URL` — add `?pgbouncer=true` to the end |
| **Session pooler** | `5432` | `DIRECT_URL` |

3. In both, replace `[YOUR-PASSWORD]` with the database password from step 1.

> Don't use "Direct connection" — on the free plan it only works over IPv6, which most home networks and Vercel don't support.

Example of the finished values:
```
DATABASE_URL="postgresql://postgres.abcdefgh:MyPassw0rd@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.abcdefgh:MyPassw0rd@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 3. Copy the storage keys
1. Go to **Project Settings** (gear icon) → **API Keys** (or **API** on older dashboards).
2. Copy:
   - **Project URL** → `SUPABASE_URL` (looks like `https://abcdefgh.supabase.co`; also shown under **Data API**)
   - The **secret** key (`sb_secret_…`) **or** the legacy **service_role** key → `SUPABASE_SERVICE_KEY`

> ⚠️ This key can read every file. Never put it in the web app, never commit it, never share it in screenshots.

You don't need to create a storage bucket by hand — step 4 does it, and makes it **private**.

### 4. Create the tables, super admin and bucket (from your Mac)
1. Open `server/.env` and fill in the values from steps 2–3 (`server/.env.example` shows every variable). Also set:
   - `SUPERADMIN_EMAIL` — your real login email for the demo
   - `SUPERADMIN_PASSWORD` — a strong password (not `ChangeMe@123`)
2. Run:
   ```bash
   npm run db:setup
   ```
   You should see `✓ Created super admin` and `✓ Created private storage bucket "workflow-files"`.

Your Mac now uses the same Supabase database when you run the app locally.

---

## Part 2 — Vercel (website + API)

1. Go to **https://vercel.com** → sign in with GitHub → **Add New… → Project**.
2. Import **saroj-cmd/workflow**.
3. If Vercel says *"Multiple applications detected"*, choose to import the **whole repository as one project** (not separate projects / Services). The repo's `vercel.json` already tells Vercel how to build both parts.
4. Settings:
   - **Root Directory:** `./` (leave as the repository root)
   - **Framework Preset:** `Other`
   - Leave build/output settings alone — `vercel.json` sets them.
5. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | same as in `server/.env` |
| `DIRECT_URL` | same as in `server/.env` |
| `SUPABASE_URL` | same as in `server/.env` |
| `SUPABASE_SERVICE_KEY` | same as in `server/.env` |
| `SUPABASE_BUCKET` | `workflow-files` |
| `JWT_SECRET` | a **new** random value — run `openssl rand -hex 32` on your Mac and paste the output |
| `EMPLOYEE_ID_PREFIX` | `EMP` (or your own, e.g. `ATS`) |

6. Click **Deploy**. When it's done, open the URL and sign in with your super admin email/password from Part 1, step 4.

Check it's wired up: open `https://<your-app>.vercel.app/api/v1/health` — it should show `{"ok":true,"storage":"supabase"}`.

---

## Updating the demo
Every `git push` to `main` redeploys automatically. If you change `server/prisma/schema.prisma`, run `npm run db:setup` from your Mac first so the database matches.

## Free-tier things to know
- Supabase pauses a free project after ~1 week with no activity. Un-pause it from the Supabase dashboard (one click); data is kept.
- Uploads are limited to **4 MB** per file (Vercel's request size limit).
- Vercel's free (Hobby) plan is for non-commercial use — fine for a demo.
- Use sample images for Aadhaar/PAN in the demo, not real ones.
