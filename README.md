# Personal Hub (tsu-stack) — Career Mail Assistant P0

Open-source, self-hostable **career OS**: multi-user portfolios, evidence graph (experiences, projects, stacks), resume import/generate, applications CRM, and **Career Inbox** — a mail assistant that turns hiring email into CRM and apply actions.

This git worktree tracks branch **`feature/career-mail-assistant-p0`**: foundation work for the Career Mail Assistant (labels, hub categories, job preferences, classify routing, sparse notifications, apply-package paths). Full product design lives under `docs/superpowers/`.

## Intention

- **Free OSS** — MIT; no Stripe, seats, or paywalled core features
- **Self-host first** — Docker Compose / Dokploy; feature parity with any hosted demo
- **BYO AI + Resend** — operators/users supply LLM and mail keys; no platform-funded model or email budget
- **No SaaS billing in this tree** — community multi-user, not a monetized product

Glossary: [CONTEXT.md](./CONTEXT.md). Agent/contributor map: [AGENTS.md](./AGENTS.md).

---

## Business overview

### What the product is

| Layer                     | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Public portfolio**      | Path `/{username}` or verified custom domain; evidence opted into `portfolio_entry`            |
| **Evidence graph**        | Experiences, projects, stacks, contact — tenant-scoped by `userId`                             |
| **Resumes**               | Import + generate PDF; link to applications                                                    |
| **Applications CRM**      | Private job pipeline (saved → applied → screening → interview → offer; outcomes close the row) |
| **Career Inbox**          | In-app mail hub for hiring signal (not a personal Gmail clone)                                 |
| **Career Mail Assistant** | Classify → act: noise demote, CRM effects, job digests → applications, reply assist            |
| **Mail reply**            | On-the-fly generate + human confirm send in Career Inbox                                       |
| **Connections**           | Gmail sync, GitHub OAuth/public repo surface, AI provider keys                                 |

### Multi-user tenancy

| Surface                       | Behavior                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| **Registration**              | First user bootstraps empty DB; later signups need an **invite** |
| **Public portfolio (path)**   | `/{username}/…` on primary app host                              |
| **Public portfolio (domain)** | Verified **custom domain** → that user’s portfolio at `/`        |
| **Public GitHub**             | `/{username}/repos` (path) or `/repos` on custom domain          |
| **Dashboard / auth**          | Always on primary host (`VITE_WEB_URL`)                          |
| **Tenancy**                   | Private rows scoped by Better Auth **`userId`**                  |

Custom domain: app stores hostname + verification; **operator** terminates TLS (Cloudflare/Caddy/etc.). App does not issue certs.

### Career Mail Assistant (this branch focus)

```text
every mail
  → cheap prefilter + classify
  → noise            → demote (no notify)
  → needs action     → hub card + notify
  → job_notifier     → harvest links → score prefs → Applications
  → career labels    → CRM / reply paths
  → application_status → CRM status path (not new job crawl)
```

**System labels:** `application` | `recruiter` | `interview` | `offer` | `job_notifier` | `noise` | `application_status`

**Hub categories:** needs_action, applications, recruiters, interviews, offers, noise, unsorted, all (+ smart rules)

**Job preferences (per user):** work modes, locations, role/exclude keywords, salary floor, `minMatchScore` (default 60). Auto-harvest skips below threshold; manual application create is unrestricted.

**Apply methods:** `easy_apply` | `external` | `email` | `unknown` — dual URLs (`url` listing, `applyUrl` apply destination).

**Sparse notifications:** needs_action, apply_nudge, job_alerts_ready batch, review draft ready — not every classify/crawl step.

**AI autonomy:** Assist (draft + confirm) vs Full (auto-send) for mail replies — settings under AI, not notifications.

Specs:

- [Career Mail Assistant design](docs/superpowers/specs/2026-07-31-career-mail-assistant-design.md)
- [P0 implementation plan](docs/superpowers/plans/2026-07-31-career-mail-assistant-p0.md)
- [Career Inbox + AI platform](docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md)
- [Applications CRM](docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md)
- [Apply package / workflow split](docs/superpowers/specs/2026-08-04-apply-package-workflow-split-design.md)

### Dashboard surfaces (web)

| Route area | Business purpose |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------- | --------------------------- |
| `/dashboard` | Hub home |
| `/dashboard/mail/*` | Career Inbox by category (generate + confirm send reply) |
| `/dashboard/new-jobs` | AI job discoveries (inbox / dismissed) |
| `/dashboard/tracked-jobs` | Job pipeline board/list |
| `/dashboard/experiences   | projects                                                                                   | stacks` | Evidence CRUD (Sheet forms) |
| `/dashboard/resumes` | Resume library |
| `/dashboard/onboarding` | Owner onboarding / resume import |
| `/dashboard/settings/*` | Profile, account, domain, invites, connections, mail, AI, jobs prefs, rules, notifications |
| `/{username}` | Public portfolio |
| `/{username}/repos` | Public GitHub surface |

---

## Tech stack

| Layer            | Choice                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| Monorepo         | pnpm workspaces + Vite Plus (`vp`)                                            |
| Web              | **TanStack Start** (Router, Query, Form, Table), React                        |
| API              | **Hono** + **oRPC** (typed procedures)                                        |
| Auth             | **Better Auth** (invite-gated signup, OAuth)                                  |
| DB               | **Postgres** + **Drizzle** (`packages/db`)                                    |
| Domain contracts | **Zod** in `packages/core`                                                    |
| Queues           | **BullMQ** + Redis (mail classify, Gmail sync, harvest, …)                    |
| Agents           | **Mastra** (`apps/agent`) — classify, harvest, reply, apply-package workflows |
| Realtime         | Socket.IO (+ optional Redis adapter) for GitHub signal fan-out                |
| Mail egress      | Resend (BYO, optional)                                                        |
| Mail ingress     | Gmail sync / Resend / manual                                                  |
| PDF              | pdfnative (resume generation)                                                 |
| Storage          | S3-compatible (MinIO local)                                                   |
| UI               | `@tsu-stack/ui` / coss / Base UI primitives                                   |
| Logging          | `@tsu-stack/logger` + evlog                                                   |

### Monorepo layout

| Path                      | Role                                          |
| ------------------------- | --------------------------------------------- |
| `apps/web`                | TanStack Start UI (features + pages + routes) |
| `apps/server`             | Hono + oRPC API, queues, Socket.IO            |
| `apps/agent`              | Mastra agents, workflows, skills              |
| `packages/core`           | Shared Zod schemas, pure domain helpers       |
| `packages/db`             | Drizzle schema, migrations, repositories      |
| `packages/api`            | oRPC routers / server-side API surface        |
| `packages/auth`           | Better Auth wiring                            |
| `packages/email`          | Transactional email templates                 |
| `packages/ui`             | Shared UI kit                                 |
| `packages/env`            | Validated env                                 |
| `packages/github`         | GitHub integration helpers                    |
| `packages/logger` / `seo` | Cross-cutting                                 |

---

## Tech patterns

### End-to-end feature flow

Preferred order when shipping a domain capability (see `.agents/end-to-end-features.md`):

1. **`packages/core`** — Zod types, constants, pure logic (classify heuristics, apply-package assembly, …)
2. **`packages/db`** — schema + migration + repository
3. **`packages/api`** — oRPC procedures, auth/tenant scoping
4. **`apps/server`** — queues/workers if async
5. **`apps/agent`** — Mastra agent/workflow/skill when AI is involved
6. **`apps/web`** — feature API wrappers + UI + routes

Never invent API strings in the web app: use typed oRPC clients.

### Web (TanStack Start)

- Routes under `apps/web/src/routes/` with route groups (`__protected`, guest, `$username`)
- **Features** (`src/features/*`): slice-local query/mutation files
- **Pages** (`src/pages/*`): compose features into screens
- TanStack Query + oRPC wrappers (`.agents/api-fetching-patterns.md`)
- Forms: TanStack Form conventions (project skill `tanstack-form-conventions`)
- Entity create/edit: **Sheet** (drawer), not full-screen modals for long forms (ADR 0025)
- Applications board: stage columns; outcomes close rows (not extra stages)

### API & server

- oRPC procedures with request-scoped logging
- Tenant: resolve session `userId` for private RPCs; public RPCs resolve `username` / Host → `userId`
- Mail pipeline jobs: `mail-classify-queue`, `gmail-sync-queue`, `mail-job-harvest-queue`, CRM apply effects
- GitHub cache: signal rows + namespace versions; Socket.IO relay + poll fallback

### Agent (Mastra)

- Register agents/workflows/tools/scorers in `apps/agent/src/mastra/index.ts`
- Skills under `apps/agent/skills/` (e.g. `mail-classification`, `job-notifier-harvest`, `crm-stage-policy`, `application-apply-package`)
- Auth to agent HTTP via Better Auth sessions (`MastraAuthBetterAuth`)
- BYO AI keys from user settings; missing keys → graceful degrade (heuristics / skip AI step)
- Load **mastra skill** before Mastra work (APIs change)

### Mail intelligence pipeline

```text
Ingress (gmail | resend | manual)
  → mail_message
  → classify (heuristic prefilter + LLM kinds)
  → labels + needsAction
       ├─ noise / job_notifier / career labels / application_status
       └─ job_notifier → harvest (P1 full crawl; P0 may stub enqueue)
              → Applications (stage saved, matchScore, applyMethod, urls)
```

### Evidence & portfolio

- Opt-in via `portfolio_entry` row (visibility gate), not a boolean on the entity
- AI agents and public portfolio only see opted-in evidence
- Stacks can be detected from `package.json` (ADR 0017)

### Auth

- Invite-gated multi-user registration
- Protected vs guest route rules (`.agents/auth.md`)
- OAuth cookies stay on first-party `VITE_SERVER_URL` even when public webhooks use a tunnel

### Tooling

```bash
pnpm check / pnpm fix     # Vite Plus checks
pnpm test:unit:run
pnpm test:e2e:run
pnpm db:migrate | db:studio
pnpm tanstack …           # TanStack docs CLI
```

Contributor docs: `.agents/*` (TanStack, oRPC, auth, media, logging, testing, workflow).

---

## Quick start (local)

```bash
# Env: copy and edit (DATABASE_URL → local Docker Postgres)
cp packages/env/.env.example packages/env/.env

# Apps — scripts/dev.sh starts Postgres/Redis/MinIO and runs migrations
# If server/agent crash on a file-watch reload, the orchestrator restarts them.
# Disable: DEV_NO_RESTART=1 pnpm dev
pnpm dev

# Public HTTPS tunnel for Resend / Gmail / GitHub webhooks (cloudflared CLI)
pnpm dev:tunnel

# Optional: infra or migrate without booting apps
# pnpm dev:infra
# pnpm db:migrate
```

Configure at least: `VITE_WEB_URL`, `VITE_SERVER_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, and OAuth as needed. LLM features use **Settings → AI** BYO keys. Agent worker uses Better Auth sessions.

### Local inbound webhooks (`cloudflared`)

SaaS providers cannot reach `http://localhost`. `scripts/dev.sh` can start a **cloudflared** tunnel to the API (`:5200`) and export `PUBLIC_SERVER_URL` / `DEV_PUBLIC_SERVER_URL` for inbound webhooks. **Browser OAuth and oRPC keep `VITE_SERVER_URL=http://localhost:5200`** so session cookies stay first-party. The web app stays at `http://localhost:3000` (override with `DEV_WEB_URL`).

| Mode                  | When                                   | Env                                                                                                                                                   |
| --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Named (stable)**    | Gmail push + OAuth + Resend day-to-day | `DEV_TUNNEL=1`, `DEV_TUNNEL_MODE=named`, `DEV_PUBLIC_SERVER_URL=https://api-dev.your.domain`, `DEV_CLOUDFLARED_CONFIG=scripts/cloudflared.tunnel.yml` |
| **Quick (ephemeral)** | One-off smoke tests                    | `pnpm dev:tunnel` → `https://*.trycloudflare.com` (URL changes every run)                                                                             |
| **External tunnel**   | You already run `cloudflared`          | `DEV_PUBLIC_SERVER_URL=https://…` without starting tunnel                                                                                             |

Setup: `scripts/cloudflared.tunnel.example.yml` and `DEV_*` in `packages/env/.env.example`. Requires **cloudflared** binary (`brew install cloudflared`) — not Workers/Wrangler as app host (prod is Dokploy/Docker).

On start, the script prints a **webhook URL banner** (Resend, Gmail push, GitHub webhook, OAuth callbacks). Settings → Mail webhook URLs use `PUBLIC_SERVER_URL` when set.

### Docker

```bash
pnpm docker:local          # helper
pnpm docker:up             # full compose
pnpm docker:up:build
```

See `docker-compose.yml`, `docker-compose.infra.yml`, `docker-compose.local.yml`.

---

## Career / contribution notes (for portfolio feed)

Use this section when this repo feeds a career system about **work done on this product**.

| Field                  | Value (fill/adjust)                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**            | Personal Hub / tsu-stack — self-host career OS                                                                                         |
| **Branch focus**       | Career Mail Assistant P0 (+ related apply-package, CRM, inbox)                                                                         |
| **Areas demonstrated** | Multi-tenant career product, mail intelligence pipeline, applications CRM, AI agent workflows (Mastra), monorepo full-stack TypeScript |
| **Stack signal**       | TanStack Start, Hono, oRPC, Drizzle, Better Auth, BullMQ, Mastra, Socket.IO, Zod-first domain                                          |

**Representative shipped themes on this line of work** (from branch history / design):

- Career Inbox hub (categories, reader, smart rules, review queue)
- Mail classify labels + heuristics + agent classification
- Applications CRM (stages, outcomes, match score, apply method, dual URLs)
- Job preferences and job-notifier → harvest → applications path
- Apply package: multi-step agent workflow, resume PDF outreach send
- Evidence portfolio, resume import/generate, GitHub public surface
- Invite multi-user tenancy and custom domain routing

Add personal role, dates, and metrics in your career profile — this README documents the **product and engineering surface**, not employment claims.

---

## Docs map

| Doc                        | Use when                                           |
| -------------------------- | -------------------------------------------------- |
| [CONTEXT.md](./CONTEXT.md) | Ubiquitous language                                |
| [AGENTS.md](./AGENTS.md)   | How to work in the monorepo                        |
| `docs/adr/*`               | Architecture decisions                             |
| `docs/superpowers/specs/*` | Product design locks                               |
| `docs/superpowers/plans/*` | Implementation plans                               |
| `.agents/*`                | Pattern playbooks (auth, oRPC, TanStack, media, …) |

## License

[MIT](./LICENSE)
