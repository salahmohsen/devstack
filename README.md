# DEV-STACK

Self-hostable job-apply assistant with a public portfolio.

Ingest career mail, track applications, generate apply packages, and talk to a hub agent. The same account publishes opted-in evidence on `/{username}` or a verified custom domain.

Internal monorepo name: `tsu-stack` (this repo is also called `personal-hub`).

## Highlights

- **Apply loop** — Career Inbox, applications CRM, resumes, hub chat / apply packages
- **Public surface** — portfolio + GitHub repos on path or custom domain
- **BYO keys** — per-tenant AI and optional Resend; no platform model or mail budget
- **Invite-gated** — first user bootstraps the install; later signup follows invite-only or open
- **Self-host** — Docker Compose / Dokploy; MIT

## Stack

| Layer   | Choice                                                                          |
| ------- | ------------------------------------------------------------------------------- |
| Apps    | TanStack Start (`apps/web`), Hono + oRPC (`apps/server`), Mastra (`apps/agent`) |
| Data    | Postgres + Drizzle, Redis / BullMQ, S3-compatible storage (MinIO locally)       |
| Auth    | Better Auth (username, admin, invite / open signup, OAuth)                      |
| Domain  | Zod contracts in `@tsu-stack/core`                                              |
| Tooling | pnpm workspaces, Vite Plus (`vp`)                                               |

```text
apps/web          UI (dashboard + public site)
apps/server       API, queues, realtime
apps/agent        Mastra agents and workflows
packages/core     Shared schemas and helpers
packages/db       Drizzle schema and repositories
packages/api      oRPC routers
packages/auth     Better Auth
packages/*        ui, env, email, github, pdf, logger, seo, …
```

## Quick start

```bash
cp packages/env/.env.example packages/env/.env
# Set at least VITE_WEB_URL, VITE_SERVER_URL, DATABASE_URL, BETTER_AUTH_SECRET

pnpm install
pnpm dev          # Postgres / Redis / MinIO + migrate + apps
```

| Service       | URL                   |
| ------------- | --------------------- |
| Web           | http://localhost:3000 |
| API           | http://localhost:5200 |
| Mastra studio | http://localhost:4111 |

LLM features need keys under **Settings → AI**. Optional OAuth (GitHub / Google) and Resend live in env / Settings.

### Inbound webhooks

Providers cannot reach `localhost`. For Gmail push, Resend, or GitHub webhooks:

```bash
pnpm dev:tunnel
```

Keep `VITE_SERVER_URL` on `http://localhost:5200` so OAuth cookies stay first-party. The tunnel only exposes a public origin for inbound webhooks (`DEV_PUBLIC_SERVER_URL`). See `packages/env/.env.example` and `scripts/cloudflared.tunnel.example.yml`.

### Docker

```bash
pnpm docker:local       # helper for local full stack
pnpm docker:up          # compose
pnpm docker:up:build
```

## Useful commands

```bash
pnpm check              # lint / type checks (Vite Plus)
pnpm fix
pnpm test:unit:run
pnpm db:migrate
pnpm db:studio
pnpm mastra:studio
```

## Docs

| Doc                        | When                                                      |
| -------------------------- | --------------------------------------------------------- |
| [CONTEXT.md](./CONTEXT.md) | Product glossary (`username`, invite, custom domain, BYO) |
| [AGENTS.md](./AGENTS.md)   | How to work in the monorepo                               |
| [PRODUCT.md](./PRODUCT.md) | Product purpose and constraints                           |
| `.agents/`                 | Pattern playbooks (auth, oRPC, TanStack, media, …)        |
| `docs/superpowers/specs/`  | Design locks                                              |
| `docs/adr/`                | Architecture decisions                                    |
