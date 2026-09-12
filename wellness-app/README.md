# Wellness Dashboard

A private, self-hosted weight-loss and wellness platform: weight & body
metrics, blood pressure & vitals, nutrition and meal planning, exercise and
habit tracking, progress charts, and an AI Coach — all running on your own
hardware, behind your own Nginx, with your own data in your own Postgres
database.

```
Internet / LAN
      │
    Nginx  (HTTPS, reverse proxy, security headers)
      │
      ├──────────────┬──────────────┐
      │               │              │
  Frontend         Backend       (static assets
 (React/Vite,      (Express/TS    served by
  served by         REST API)     the frontend
  `serve`)             │          container)
                        │
                   PostgreSQL  (internal network only)
                        │
                  AI Service Layer
                   ├── OpenAI (or any OpenAI-compatible API)
                   ├── Ollama (local/self-hosted LLM)
                   └── Disabled (app works fully without AI)
```

Everything is configured through `.env` — no hard-coded secrets or API
keys anywhere in the code, and the frontend never sees your AI provider
key (all AI calls are made by the backend).

> **Deploying behind an existing reverse proxy (e.g. Nginx Proxy Manager +
> Portainer, as on cerberus)?** Use `docker-compose.portainer.yml` instead
> of the standalone `docker-compose.yml` below, and see
> [DEPLOY_CERBERUS.md](./DEPLOY_CERBERUS.md) — the bundled Nginx container
> here assumes it owns ports 80/443, which won't be true if something else
> already does.

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [HTTPS / Nginx](#https--nginx)
- [Enabling the AI Coach](#enabling-the-ai-coach)
- [Database & migrations](#database--migrations)
- [Backups & restore](#backups--restore)
- [Data export](#data-export)
- [Local development (without Docker)](#local-development-without-docker)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [iOS Shortcuts: automatic step count sync](#ios-shortcuts-automatic-step-count-sync)
- [Troubleshooting](#troubleshooting)
- [Roadmap / future integrations](#roadmap--future-integrations)

## Quick start

Requirements: a Linux host (or any Docker host) with **Docker** and the
**Docker Compose plugin** installed.

```bash
git clone <this-repo-url>
cd wellness-app

# 1. Configure secrets
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# (generate each with: openssl rand -hex 32), and APP_DOMAIN/PUBLIC_ORIGIN.

# 2. Get a TLS certificate (pick one)
#    a) LAN-only, self-signed (browsers show a one-time warning):
./scripts/generate-self-signed-cert.sh
#    b) Real domain with Let's Encrypt — see "HTTPS / Nginx" below.

# 3. Build and start everything
docker compose up -d --build

# 4. Watch the backend come up and run its database migration
docker compose logs -f backend
```

Once the backend reports it's listening, open `https://<your-domain-or-ip>/`
in a browser. The first account you register becomes your account — by
default (`SINGLE_USER_MODE=true`) no one else can register on this
instance, which is the expected setup for a personal server.

## Environment variables

All configuration lives in `.env` (copied from `.env.example`). Key groups:

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials, used to build `DATABASE_URL`. Never exposed outside the internal Docker network. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Random secrets signing login sessions. Generate each with `openssl rand -hex 32`. Rotating either logs everyone out. |
| `SINGLE_USER_MODE` | `true` (default): only one account can ever exist on this server. Set `false` to allow more (e.g. a partner's account). |
| `COOKIE_SECURE` | Keep `true` in production (HTTPS). Only set `false` for plain-HTTP local development. |
| `AI_PROVIDER` / `AI_MODEL` | See [Enabling the AI Coach](#enabling-the-ai-coach). |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | Only used when `AI_PROVIDER=openai`. Backend-only, never sent to the browser. |
| `OLLAMA_BASE_URL` | Only used when `AI_PROVIDER=ollama`. |
| `APP_DOMAIN` / `PUBLIC_ORIGIN` | Your domain or LAN hostname/IP, and the full `https://` origin the browser uses. |
| `BACKUP_DIR` / `BACKUP_RETENTION_DAYS` | Where `scripts/backup.sh` writes dumps and how long it keeps them. |

See `.env.example` for the full, commented list.

## HTTPS / Nginx

Nginx terminates TLS, redirects HTTP → HTTPS, sets security headers
(HSTS, CSP, X-Frame-Options, etc.), proxies `/api/*` to the backend and
everything else to the frontend, and never exposes Postgres to the network.
Config lives in `nginx/nginx.conf` and `nginx/conf.d/wellness.conf`.

**Option A — LAN-only, self-signed certificate** (simplest; good if you
only access this from your home network or a VPN like Tailscale/WireGuard):

```bash
./scripts/generate-self-signed-cert.sh            # CN=wellness.local
# or: ./scripts/generate-self-signed-cert.sh 825 192.168.1.50
```

**Option B — real domain, trusted certificate (Let's Encrypt / certbot)**,
for accessing the dashboard securely from outside your home network:

1. Point a DNS record at your home IP and forward ports 80/443 on your router.
2. Run certbot (standalone or via a sidecar container) to obtain a
   certificate for `APP_DOMAIN`, then copy/symlink the resulting
   `fullchain.pem` and `privkey.pem` into `nginx/certs/`.
3. Set up a renewal cron job (certbot handles this itself if installed on
   the host); reload Nginx after renewal: `docker compose exec nginx nginx -s reload`.

Either way, once certs exist in `nginx/certs/`, `docker compose up -d` (or
`restart nginx`) picks them up.

## Enabling the AI Coach

The AI Coach is fully optional — every other feature (logging, charts,
goals, habits, exports) works with it disabled. All AI calls go through a
single backend abstraction (`backend/src/services/ai/`), so switching
providers is just an env var change; the frontend and database schema
never change.

**Option 1 — a hosted OpenAI-compatible API:**

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Option 2 — a local/self-hosted model via Ollama** (fully offline, no
external API calls or key):

```env
AI_PROVIDER=ollama
AI_MODEL=llama3
OLLAMA_BASE_URL=http://ollama:11434
```

```bash
docker compose --profile local-ai up -d   # starts the bundled Ollama container
docker compose exec ollama ollama pull llama3
```

**Option 3 — disabled (default):** `AI_PROVIDER=disabled`. The Coach tab
explains this in the UI and the rest of the app is unaffected.

Adding another provider later means implementing the small `AIProvider`
interface (`chat()` + `isAvailable()`) in `backend/src/services/ai/providers/`
and adding one case to `createProvider()` in `AIService.ts` — nothing else
in the app needs to change.

**Safety layer:** every AI request is routed through
`services/ai/safety.ts`, which prepends a system prompt forbidding
diagnosis, medication changes, or presenting speculation as fact — see the
code comments there for the full rule set, and `AI_EXTRA_SAFETY_RULES`
(comma-separated) in `.env` to add your own without touching code.

## Database & migrations

Schema is defined in `backend/prisma/schema.prisma`. The backend container
runs `prisma migrate deploy` automatically on startup, applying any
migrations in `backend/prisma/migrations/` that haven't run yet — normal
`docker compose up -d` deploys are safe to re-run.

To add a schema change during development:

```bash
cd backend
# edit prisma/schema.prisma, then:
npx prisma migrate dev --name describe_your_change
```

Commit the generated `prisma/migrations/<timestamp>_describe_your_change/`
folder — that's what `migrate deploy` applies in production.

## Backups & restore

```bash
./scripts/backup.sh              # writes backups/wellness_<timestamp>.sql.gz
./scripts/restore.sh backups/wellness_20250101_030000.sql.gz
```

Backups are plain `pg_dump` output, gzip-compressed, written to
`BACKUP_DIR` (default `./backups`, outside any Docker volume so it's easy
to copy off-box). `backup.sh` also prunes files older than
`BACKUP_RETENTION_DAYS`. To automate, add a host cron job:

```cron
0 3 * * * cd /path/to/wellness-app && ./scripts/backup.sh >> backups/backup.log 2>&1
```

`restore.sh` prompts for confirmation before overwriting the live database.

## Data export

From **Progress → Export your data** in the app, or directly:

- `GET /api/export/json` — everything, as JSON
- `GET /api/export/csv/:dataset` — one dataset as CSV (`weightEntries`,
  `bodyMeasurements`, `bloodPressure`, `vitals`, `waterEntries`,
  `sleepEntries`, `stepEntries`, `habitEntries`)
- `GET /api/export/pdf` — a summary PDF health report

All export endpoints require your access token and are logged in the
audit log (Settings → account activity, via `GET /api/users/me/audit-log`).

## Local development (without Docker)

Run Postgres however you like (e.g. `docker run -p 5432:5432 postgres:16-alpine`
with matching credentials), then:

```bash
# Backend
cd backend
npm install
cp ../.env.example .env   # adjust DATABASE_URL to localhost, COOKIE_SECURE=false
npx prisma migrate dev
npm run dev                # http://localhost:4000

# Frontend, in another shell
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :4000
```

## Project structure

```
wellness-app/
├── backend/            Express + TypeScript API
│   ├── prisma/          schema.prisma, migrations/
│   └── src/
│       ├── routes/       one file per resource (weight, meals, ai, …)
│       ├── services/     business logic (metrics, nutrition, goals, ai/)
│       ├── middleware/   auth, validation, rate limiting, errors
│       └── config/       env validation
├── frontend/            React + TypeScript + Tailwind (Vite)
│   └── src/
│       ├── pages/         Dashboard, Log, Meals, Coach, Progress, Settings
│       ├── components/    Card, ProgressRing, BottomNav, quick-log sheets…
│       └── api/           typed fetch client + endpoint functions
├── nginx/               nginx.conf, conf.d/, certs/
├── scripts/             backup.sh, restore.sh, generate-self-signed-cert.sh
└── docker-compose.yml
```

## Security notes

- Passwords are hashed with bcrypt; JWT access tokens are short-lived and
  kept in memory only (never `localStorage`); refresh tokens live in an
  `httpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/auth`.
- Postgres is never published to the host or internet — only reachable
  from other containers on the internal Docker network.
- Nginx applies HSTS, CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  and rate-limits `/api/auth/*` and `/api/*` at the edge; the backend
  rate-limits again independently.
- All health data endpoints require authentication; every export and
  password change is written to the audit log.
- The AI Coach never sees your data unless you enable a provider, and the
  API key/URL for that provider never leaves the backend.
- Personal API tokens (Settings → API tokens) are for non-interactive
  clients like iOS Shortcuts. Each is a random 256-bit value shown once at
  creation and stored server-side only as a SHA-256 hash — losing it means
  generating a new one, not recovering the old one. Treat a token like a
  password: anyone who has it can act as you, so revoke it immediately if
  it's ever exposed (e.g. pasted somewhere public).

## iOS Shortcuts: automatic step count sync

There's no Apple Health cloud API, so the app can't pull your step count on
its own. Instead, an iOS Shortcut reads today's step count from Health and
pushes it to the app using a personal API token — this runs entirely on
your phone, nothing routes through Apple or a third party.

1. **Create a token**: in the app, go to **Settings → API tokens**, give it
   a name like "iPhone Shortcuts", and tap **Create**. Copy the token
   immediately — it's only shown once. It looks like `wln_<64 hex chars>`.
2. **Build the Shortcut** (Shortcuts app → **+** → new shortcut):
   - Add **Get Health Sample** → type **Steps**, set the range to **Today**.
   - Add **Calculate Statistics** on the health samples → statistic **Sum**
     (a single day can have many short samples that need adding together).
   - Add **Get Contents of URL**:
     - URL: `https://<your-domain>/api/steps`
     - Method: `PUT`
     - Headers: `Authorization` → `Bearer <your token>`, `Content-Type` →
       `application/json`
     - Request body (JSON): `{"date": "<today>", "steps": <sum from above>}`
       — for `date`, add a **Format Date** action (`Current Date`, format
       `yyyy-MM-dd`) and insert it as the `date` value; insert the
       Calculate Statistics result as `steps`.
3. **Automate it**: Shortcuts app → **Automation** → **+** → **Create
   Personal Automation** → **Time of Day** (e.g. 11:55 PM daily, or run it
   more often — `PUT /api/steps` overwrites that day's total, so re-running
   it is safe). Choose **Run Immediately** (not "Ask Before Running") so it
   fires unattended.

Steps logged this way show up on the Dashboard and in Progress → Steps
exactly like a manual entry — the endpoint doesn't distinguish who called
it, only that the token belongs to your account.

## Troubleshooting

- **Backend won't start / `migrate deploy` fails**: check
  `docker compose logs backend` — usually a `DATABASE_URL` mismatch with
  `POSTGRES_USER`/`PASSWORD`/`DB` in `.env`.
- **Browser shows a certificate warning**: expected with the self-signed
  script; click through once, or switch to a real certificate (see
  [HTTPS / Nginx](#https--nginx)).
- **"AI Coach is disabled"**: set `AI_PROVIDER` in `.env` and
  `docker compose up -d backend` to pick it up; check `GET /api/ai/status`.
- **Can't register a second account**: that's `SINGLE_USER_MODE=true`
  working as intended — set it to `false` in `.env` and restart the backend.

## Roadmap / future integrations

The data model and AI abstraction are built so these can be added without
a redesign: automatic sync for weight/vitals from Google Health Connect /
Garmin / Fitbit / Withings (steps already work today via [iOS
Shortcuts](#ios-shortcuts-automatic-step-count-sync) and personal API
tokens), smart scale and BP monitor integrations, barcode scanning for
food lookup, grocery delivery handoff, calendar sync, and push
notifications. None of these are implemented yet.
