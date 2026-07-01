# personal-hub

A self-hosted portfolio platform that pulls your GitHub profile into a public site, layers an AI-driven identity on top of it, and applies to jobs on your behalf. Built on top of [tsu-stack](https://github.com/tsu-moe/tsu-stack) and derived in large part from [diffkit](https://github.com/stylessh/diffkit) — see the [Acknowledgements](#acknowledgements) section for the original attributions.

The public site is live at **[salahmohsen.com](https://salahmohsen.com)**.

## What it is

personal-hub is a self-hosted portfolio platform for a single owner. The product has four surfaces:

- **Public site** at **[salahmohsen.com](https://salahmohsen.com)** — a profile page, contribution graph, pinned repos, a curated list of projects, experiences, and stacks (all sourced from the owner's GitHub data), and a full repository browser that lets visitors read any of the owner's repos (file tree, blob view, branch comparison, contributors, activity). A planned contact action will let visitors send an email to the owner, and a planned public-side AI agent will let recruiters chat with the portfolio and get answers grounded in the public data the owner has chosen to expose.
- **Dashboard** at `/dashboard` — full CRUD for projects, experiences, and stacks; settings (account, profile, GitHub); and a planned email client for triaging the inbound contact-form messages and the outbound job-application threads. The dashboard's main page is being designed around a private agent with access to both the owner's private and public tools and workflows.
- **AI layer** — the cross-cutting engine. The dashboard agent can read a pasted job ad, draft a tailored cover letter and a tailored resume, render the resume to a typed PDF template, and send the email with the PDF attached. Per-item "suggest better content" buttons on the experience and project edit pages use real repo data to draft stronger descriptions, summaries, and other fields. An identity agent reads READMEs, AGENTS.md, `.cursorrules`, and recent commits to propose facet changes.
- **Deploy surface** — two Cloudflare Workers (web + server), Neon Postgres, Cloudflare R2, Resend transactional email, and the GitHub cache + webhooks plumbing.

The product is opinionated:

- One owner, one GitHub identity, one source of truth.
- Every project, experience, and stack has explicit visibility controls for the public site and for the AI.
- The AI never publishes anything on its own — it proposes, the owner decides.
- The owner can override any AI-suggested field with a manual edit; the AI never writes without an owner action.

## Status

The project is in active development. The list below tracks what is shipped, in flight, and planned.

### Shipped

- **Portfolio domain** — full CRUD for `project`, `experience`, and `stack` with ordering, sort, and per-item enable/disable flags.
- **Public homepage** — profile, contribution graph, pinned repos, projects, experience timeline, and tech stack badges.
- **Repository browser** — `/:owner/:repo` routes for browsing any repo (file tree, blob view with syntax highlighting, branch comparison, latest commit, contributors, activity).
- **GitHub integration** — OAuth flow, per-user token, public/anonymous + owner-authenticated Octokit split, server-side cache with namespace and signal invalidation, webhook delivery-dedup, and a Cloudflare Durable Object (`GITHUB_SIGNAL_RELAY`) that fans invalidation events out to live WebSocket clients.
- **Authentication** — Better Auth with magic link, GitHub OAuth, passkeys, and email verification.
- **Transactional email** — welcome, sign-in magic link, email verification, and reset-password templates via Resend.
- **Image storage** — R2-backed uploads through `files-sdk` with progress UI, used for project logos and stack icons.
- **Settings dashboard** — account, profile, and GitHub configuration (token, username, public visibility).
- **Database** — Neon Postgres with Drizzle ORM, migrations, and a typed repository layer.
- **Deployment** — two Cloudflare Workers (web + server) with a `wrangler.jsonc` per app, R2 binding, Durable Object bindings, and a GitHub Actions CI.

### In progress (`feat/mastra-ai` branch)

The features below live on the `feat/mastra-ai` branch and are **not** on `main`. `main` is the stable, deployable surface for the portfolio, the GitHub cache, and the public site; the AI branch is layered on top and gets merged in once the agents and workflows are production-ready.

- **AI layer (Mastra)** — agents and workflows scaffolded under `packages/ai`, mounted into the Hono server, and wired to D1-backed Mastra storage and observability.
- **Identity model** — typed facets (`headline`, `bio`, `focus_log`, `narrative`) with immutable revisions and queued proposals; every write records its source and a human-readable reason.
- **Identity agent** — the inner, read-only LLM agent. Reads READMEs, AGENTS.md, `.cursorrules`, and recent commits to propose facet changes. Never writes directly; proposals land in the queue for the owner to accept or reject.
- **Portfolio agent** — the dashboard's main-page agent. Has access to both the owner's private tools and the public tools and workflows. Currently powers the dashboard chat; email-sending and resume-attachment capabilities are not yet wired in.
- **Per-item "suggest better content" buttons** — on every experience and project edit page, the owner can request a stronger draft for any field (description, summary, etc.). The agent pulls real data from the linked repos (READMEs, languages, structure, recent commits) and proposes a draft. The owner reviews and applies or discards.
- **Refresh workflow** — `refreshIdentityWorkflow` (gather sources → diff facets → write facets → reindex vectors) driven by GitHub webhooks and a cron schedule.
- **Working memory** — per-resource markdown cache re-rendered from the Drizzle facet rows so the LLM sees fresh identity context without paying a tool call.
- **Scorers** — toxicity, answer-relevancy, and a custom JSON-shape scorer wired into the identity workflow.

### Planned

Grouped by surface so it's clear which work lands on the public site, which lands in the dashboard, and which is cross-cutting AI infrastructure.

#### Public site

- **Recruiter AI agent** — a chat surface on the public site that recruiters can use to ask questions about the owner. The agent answers strictly from the data the owner has marked as public (published projects, published experiences, public identity facets, public stacks). No write tools, no private data, no email-sending.
- **Contact action** — a single button that opens a small form on the public site. A visitor types a message; the message lands in the owner's dashboard email client and is also delivered to the owner's inbox.

#### Dashboard

- **Email client** — a full email surface in the dashboard. Two views: **inbound** (messages from the public contact form, plus the owner's replies) and **outbound** (the threads the dashboard agent sends to recruiters on the owner's behalf). The owner can review, reply, archive, and block senders. Every agent-initiated email shows up here before it's sent, with a clear preview of the cover letter, the attached PDF, and the recipient.
- **Email-sending for the dashboard agent** — wire the portfolio agent's main-page surface to the Resend transport so it can deliver the tailored cover letter + resume PDF it drafts. Without this, the agent is read-only on the public site and chat-only on the dashboard.
- **Publish / unpublish flow** — replace the current "Create" / "Save Changes" buttons on the project and experience edit pages with `Publish` and `Unpublish`. The public site and the AI see only published items; drafts stay in the dashboard.
- **AI auto-creates projects from repos** — propose a new project from a GitHub repo with summary, description, and stack suggestions; the owner accepts or rejects.
- **AI fills the stack layer with categories** — bucket stacks into frontend / backend / infrastructure / tooling / data, etc., and keep the categorisation in sync.
- **Email-template editor** — edit the application email template (the one the agent sends to recruiters) from the dashboard. The agent always sends the latest version.

#### AI layer (cross-cutting)

- **PDF resume agent** — given the identity facets, experiences, projects, and stacks, render a JSON resume schema and produce a clean, typographic PDF that follows a fixed template. The template is the same one used for the public resume download and for the attachment the dashboard agent sends. Black-and-white, zero radius, modern minimal typography.
- **Tailored resume + cover letter** — given a pasted job ad, draft a per-application resume and cover letter that map the owner's relevant experiences and projects to the role's requirements. The cover letter goes into the email body; the resume becomes the PDF attachment.
- **Job-search agent** — automatically find open roles, analyse the description, score the match against the user's stated goals, and surface the best fits. The owner approves which roles the application agent should target.
- **Application email template** — the base template the dashboard agent uses when it sends a job application. Black-and-white, zero radius, modern minimal typography; the PDF matches. Editable from the dashboard.

## Architecture

The repository is a pnpm + Vite Plus monorepo.

```
apps/
  web/      # TanStack Start frontend, deployed to Cloudflare Workers
  server/   # Hono + oRPC API, deployed to Cloudflare Workers
packages/
  api/      # oRPC routers, procedures, and TanStack Query bindings
  app/      # App-level form / widget patterns
  auth/     # Better Auth configuration and adapters
  core/     # Shared domain schemas (portfolio, identity, AI context)
  db/       # Drizzle schema, repositories, and migrations
  email/    # React Email templates and Resend transport
  env/      # t3-env / @t3-oss/env-core configuration
  forms/    # Shared form components and validators
  github/   # Octokit wrappers, cache layer, webhook handlers
  logger/   # Structured logging (evlog)
  seo/      # generateAppSeo + route head() helpers
  ui/       # shadcn/ui registry, design tokens, shared components
tools/      # Internal tooling
```

### Tech stack

- **Frontend** — TanStack Start, TanStack Router, TanStack Query, TanStack Form, React 19, Tailwind CSS 4
- **API** — Hono, oRPC, Zod
- **Auth** — Better Auth (magic link, GitHub OAuth, passkeys, Drizzle adapter)
- **Database** — Neon Postgres, Drizzle ORM
- **Storage** — Cloudflare R2 via `files-sdk`
- **Email** — Resend + React Email
- **AI** — Mastra (agents, workflows, observability, scorers), OpenCode Go for LLM calls, Ollama / OpenAI for embeddings
- **Infrastructure** — Cloudflare Workers (web + server), Cloudflare Durable Objects, Cloudflare D1 (Mastra storage)
- **Tooling** — Vite Plus, pnpm workspaces, oxlint, TypeScript, Wrangler

#### What changed on the way in

A few layers were swapped from their upstream defaults. Worth being explicit because it changes how you operate the project day-to-day.

| Concern            | tsu-stack default                     | personal-hub choice                                                               | Why                                                                                 |
| ------------------ | ------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Database           | Postgres (configurable)               | **Neon Postgres** (serverless)                                                    | Cold-start friendly for the Workers runtime, free tier is enough for a single owner |
| Cache store        | Up to the consumer                    | Postgres `jsonb` columns in the same Neon DB                                      | Avoids adding a KV namespace binding for a single-owner workload                    |
| Linting            | ESLint                                | **oxlint** + `oxlint-tailwindcss` + `oxlint-tsgolint`                             | Faster; matches the tsu-stack toolchain in its current shape                        |
| Build orchestrator | `vp run -r build` (built in)          | Same                                                                              | —                                                                                   |
| Iconography        | `@tsu-stack/icons` / `@diffkit/icons` | **lucide-react**                                                                  | Dropped the bespoke icon package                                                    |
| Markdown rendering | `@diffkit/ui/markdown-editor`         | `react-markdown` + `remark-gfm` + `rehype-raw` + `remark-github-blockquote-alert` | Smaller dependency surface; owner can paste GitHub-flavoured markdown directly      |

## Getting started

The project targets Cloudflare Workers for both the web app and the API. The local dev environment uses Vite Plus and `wrangler dev` to emulate the Workers runtime.

### Prerequisites

- Node.js 22+
- pnpm 11+
- A Cloudflare account (for the local emulator and for deployment)
- A Neon Postgres database
- A GitHub OAuth app (for sign-in)
- A Resend API key (for transactional email)
- An OpenCode Go API key (for the AI agents)
- An OpenAI API key and / or a self-hosted Ollama instance (for embeddings)

### Install

```bash
pnpm install
pnpm prepare   # runs `vp config` to wire the Vite Plus toolchain
```

### Configure environment

Copy the example env file and fill in the required values:

```bash
cp packages/env/.env.example packages/env/.env
```

`packages/env/.env.example` documents every variable, the provider, and whether the value is build-time optional or runtime required. The two most important splits:

- **Build-time optional, runtime required** — Better Auth secret, GitHub OAuth client ID and secret, OpenCode Go API key.
- **Build-time optional, runtime optional** — Resend API key (the app logs a warning and skips sending if unset), GitHub webhook secret, R2 public base URL.

### Database

```bash
pnpm db:push        # push the schema to a local / dev database
pnpm db:generate    # generate a new migration after schema changes
pnpm db:migrate     # apply migrations
pnpm db:studio      # open Drizzle Studio
```

### Run the dev servers

```bash
pnpm dev
```

This starts the web app and the API in parallel through `wrangler dev` with the local Workers emulator.

### Deploy

Both apps deploy to Cloudflare Workers. Each app has its own `wrangler.jsonc` and its own deploy script:

```bash
pnpm deploy:server
pnpm deploy:web
```

The `apps/web/wrangler.jsonc` is currently routed to `salahmohsen.com/*`. Update the route pattern and `zone_name` before deploying your own instance.

## Project conventions

- **Domain placement** — every shared schema, type, or constant lives in `packages/core`. The `api` package imports from `core`; the `web` package imports from `core` through `api`.
- **Package namespace** — workspace packages publish as `@tsu-stack/*`. The naming is inherited from [tsu-stack](https://github.com/tsu-moe/tsu-stack); the original upstream packages in [diffkit](https://github.com/stylessh/diffkit) shipped as `@diffkit/*` and were renamed during the port.
- **Feature folders** — UI, API hooks, and feature-local helpers live next to each other under `apps/web/src/<area>/<feature>/{ui,api,lib,hooks}/` (e.g. `pages/github-repo/`, `features/identity/`, `widgets/items-page/`). This replaces the flatter `components/<feature>/` + `lib/<thing>.ts` layout that diffkit used.
- **Forms** — every form uses the shared `@tsu-stack/forms` form pattern with a Zod validator. No ad-hoc `useState` forms.
- **Data fetching** — every server read goes through TanStack Query with an oRPC-derived query key. No bare `fetch` calls in components. The `lib/github.query.ts` mega-file pattern from diffkit is split into per-feature `*.query.ts` files next to the consuming pages.
- **Auth** — every protected route lives under `apps/web/src/routes/(root-layout)/__protected/` and the parent layout's `beforeLoad` enforces the session.
- **Visibility** — every portfolio item has a public-side enable flag and an AI-side enable flag. The public site only reads public items; the AI only sees items the owner has explicitly opted in to.

## Acknowledgements

personal-hub is built on the shoulders of two open-source projects.

- **[diffkit](https://github.com/stylessh/diffkit)** — a GitHub wrapper built with TanStack Start by [stylessh](https://github.com/stylessh). personal-hub is not a fork, but the following were ported from diffkit and adapted for the portfolio domain: the **GitHub cache layer** (namespace + signal invalidation, ETag/Last-Modified revalidation, the `github_response_cache` / `github_revalidation_signal` / `github_cache_namespace` tables, and the Durable Object signal relay); the **repo browser** (file tree, blob view, branch comparison, contributors, activity cards, latest-commit bar, repo overview, file search); the **public profile components** (contribution graph, pinned repo card, user activity feed); the **GitHub OAuth + webhook plumbing** (per-user token, public/anonymous + owner-authenticated Octokit split, webhook delivery-dedup); and a **slice of the dashboard settings surface** for the GitHub config form. personal-hub would not exist without diffkit.
- **[tsu-stack](https://github.com/tsu-moe/tsu-stack)** by [Luzefiru](https://github.com/Luzefiru) — the opinionated full-stack TypeScript monorepo (TanStack Start + Hono + oRPC + Drizzle + Better Auth) on which the workspace, packages, tooling, and CI are based. personal-hub is a downstream application of tsu-stack, not a fork.

Thank you to both authors.

## License

MIT — see [LICENSE](./LICENSE).
