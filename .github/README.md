# DEVSTACK

Self-hostable job-apply assistant: discover roles, track applications, draft packages with a hub agent on your keys, and publish evidence on `/{username}`.

[![CI](https://github.com/salahmohsen/devstack/actions/workflows/ci.yml/badge.svg)](https://github.com/salahmohsen/devstack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

Live install: **[devstack.salahmohsen.com](https://devstack.salahmohsen.com)** · Apex portfolio: **[salahmohsen.com](https://salahmohsen.com)**

## About

DEVSTACK closes the apply loop on infrastructure you control. Adapters fill **New jobs** from public boards; you promote roles into a tracked CRM; Career Inbox (optional Gmail) can move stages; a Mastra hub agent drafts apply packages with human review; opted-in evidence shows on your public profile or a verified custom domain.

BYO AI and optional BYO Resend mean there is no platform model or mail budget. Missing keys degrade AI steps; CRUD still works.

Built on [tsu-stack](https://github.com/tsu-moe/tsu-stack). Parts of the GitHub browser and cache layer were adapted from [diffkit](https://github.com/stylessh/diffkit).

## Features

- **New jobs** — adapters for Freehire, Himalayas, Arbeitnow, Remotive, RemoteOK; rank against prefs; optional BYO AI scoring
- **Tracked jobs** — CRM board through offer; Career Inbox can classify hiring mail and move stages with undo
- **Hub agent** — Mastra chat on sealed per-tenant provider keys; HITL for hard writes
- **Apply packages** — resume, cover letter, outreach with review gates
- **Public profile** — experiences, projects, stacks, resumes on `/{username}` or a verified custom domain
- **Self-host** — Docker Compose / Dokploy; invite-gated signup after the first operator; Host-based custom domains

## Stack

| Layer  | Choice                                                           |
| ------ | ---------------------------------------------------------------- |
| Web    | TanStack Start, React 19, Tailwind CSS 4, coss / Base UI         |
| API    | Hono, oRPC, Zod                                                  |
| Auth   | Better Auth (magic link, GitHub OAuth, passkeys)                 |
| Data   | Postgres (Drizzle), Redis                                        |
| AI     | Mastra agents / workflows, BYO provider keys                     |
| Mail   | Gmail OAuth + optional BYO Resend                                |
| Deploy | Docker Compose, Dokploy, Cloudflare Tunnel for edge Host routing |

Monorepo layout:

```
apps/
  web/      # TanStack Start UI
  server/   # Hono + oRPC API
  agent/    # Mastra agent worker
packages/
  api/ auth/ core/ db/ email/ env/ github/ logger/ seo/ ui/ …
```

Workspace packages use the `@tsu-stack/*` namespace (inherited from tsu-stack).

## Requirements

- Node.js 22+
- pnpm 11+
- Docker (local infra: Postgres, Redis, MinIO)
- GitHub OAuth app (sign-in + public GitHub surface)
- Optional: Resend API key, LLM provider keys, Cloudflare Tunnel for public webhook URLs in dev

## Getting started

```bash
pnpm install
pnpm prepare
cp packages/env/.env.example packages/env/.env
# fill DATABASE_URL, BETTER_AUTH_SECRET, VITE_WEB_URL, VITE_SERVER_URL, GitHub OAuth, …
pnpm db:migrate
pnpm dev          # or: pnpm docker:local / docker compose up
```

Dev notes:

- Web defaults to `http://localhost:3000`; API to `http://localhost:5200`
- For inbound webhooks in local dev, use `pnpm dev:tunnel` and set `DEV_PUBLIC_SERVER_URL`
- Keep browser `VITE_SERVER_URL` first-party (`localhost`) so OAuth cookies stay valid

See `packages/env/.env.example` for every variable.

## Production

Typical path: Dokploy Applications for `web`, `server`, and `agent`, plus a compose stack for Postgres/Redis/MinIO. Set `VITE_WEB_URL` to your primary app host (e.g. `https://devstack.salahmohsen.com`) and `VITE_SERVER_URL` to the API host.

Custom domains for tenants: TXT verify + CNAME to the primary app host. Operator edge checklist: [`docs/ops/custom-domains-edge.md`](../docs/ops/custom-domains-edge.md).

## Project conventions

- Shared domain contracts live in `packages/core` and propagate into API and web
- Protected routes sit under `apps/web/src/routes/(root-layout)/__protected/`
- Product glossary: [`CONTEXT.md`](../CONTEXT.md) · brand/product truth: [`PRODUCT.md`](../PRODUCT.md)
- Agent entry: [`AGENTS.md`](../AGENTS.md)

## Acknowledgements

- [diffkit](https://github.com/stylessh/diffkit) — GitHub cache, repo browser, and related public GitHub UI patterns adapted into this product
- [tsu-stack](https://github.com/tsu-moe/tsu-stack) — monorepo toolchain, packages, and full-stack TypeScript defaults

## License

MIT — see [LICENSE](../LICENSE).
