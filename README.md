# tsu-stack (personal hub)

Open-source, self-hostable **career OS** foundation: multi-user portfolios, evidence graph (experiences, projects, stacks), resume import/generate, and invite-gated registration.

## Intention

- **Free OSS** — MIT; no Stripe, seats, or paywalled core features
- **Self-host first** — Docker Compose / Dokploy; full feature parity with any hosted demo
- **BYO AI + Resend** — operators (or later users) supply LLM and mail keys; the project does not fund platform-wide model or email usage
- **No SaaS billing in this tree** — community multi-user, not a monetized product

See [CONTEXT.md](./CONTEXT.md) for product glossary terms (profile name, invite, custom domain, tenant `userId`, etc.).

## Multi-user model

| Surface                       | Behavior                                                              |
| ----------------------------- | --------------------------------------------------------------------- |
| **Registration**              | First user bootstraps an empty DB; further signups need an **invite** |
| **Public portfolio (path)**   | `/{profileName}/…` on the primary app host                            |
| **Public portfolio (domain)** | Optional **verified custom domain** → that user’s portfolio at `/`    |
| **Public GitHub (path)**      | `/{profileName}/repos` on the primary app host                        |
| **Public GitHub (domain)**    | `/repos` on a verified custom domain Host                             |
| **Dashboard / auth**          | Always on the **primary app host** (`VITE_WEB_URL`)                   |
| **Tenancy**                   | Every private domain row is scoped by **`userId`**                    |

### Custom domain + TLS

1. User sets a hostname in dashboard **Domain** settings and completes DNS verification (app-owned).
2. **Operator** points DNS at the app and terminates **TLS** (Cloudflare, Caddy, reverse proxy, etc.).
3. The app does **not** issue or renew certificates — only Host routing + ownership verify.

Primary app host for custom-domain checks is the host of `VITE_WEB_URL` (see `packages/env/.env.example`).

## Quick start (local)

```bash
# Infra (Postgres, Redis, MinIO, …)
pnpm dev:infra

# Env: copy and edit
cp packages/env/.env.example packages/env/.env

# DB
pnpm db:setup

# Apps (web + server + agent via scripts/dev.sh)
pnpm dev
```

Configure `VITE_WEB_URL`, `VITE_SERVER_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, and GitHub OAuth as needed. LLM features need `DEEPSEEK_API_KEY` (or other keys matching agent model config); leave empty to skip AI-heavy steps.

## Monorepo layout

| Path          | Role                                   |
| ------------- | -------------------------------------- |
| `apps/web`    | TanStack Start UI                      |
| `apps/server` | Hono + oRPC API                        |
| `apps/agent`  | Mastra agent worker                    |
| `packages/*`  | Shared db, auth, core, api, env, ui, … |

Agent guidance for contributors: [AGENTS.md](./AGENTS.md) and `.agents/`.

## License

[MIT](./LICENSE)
