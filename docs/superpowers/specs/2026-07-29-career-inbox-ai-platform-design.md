# Career Inbox, AI Platform & Review — Program Design

**Date:** 2026-07-29  
**Status:** Draft (grilled; pending user review after spec polish)  
**Goal:** Ship a multi-tenant **Career Inbox** and supporting **AI platform** (autonomy levels, providers/models, scorers, learning from corrections, notifications, confirmation review) that closes the loop on Applications CRM — plus foundation work (evlog/Mastra upgrades, logging, remove weather example, agent conventions).

**Related:**

- Applications CRM: `docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md`
- Multi-user tenancy: `docs/superpowers/specs/2026-07-27-multi-user-tenancy-restructure-design.md`
- Dashboard hub chat: `docs/superpowers/specs/2026-07-25-dashboard-apply-chat-ui-design.md` (weather paths deprecated by this program)
- Glossary: `CONTEXT.md`
- Logging: `.agents/logging.md`
- Auth: `.agents/auth.md`
- Mastra app rules: `apps/agent/AGENTS.md` (to be expanded in foundation epic)

**ADRs (proposed; write when implementation freezes hard choices):**

- Redis for job queues only (sessions stay Postgres)
- Mail reply Assist vs Full autonomy
- System notification mail excluded from Career Inbox by default
- Notification email destination separate from product From identity

---

## Problem statement

Seekers track applications in-app but hiring signal still lives in email. There is no first-class way to:

- Ingest and categorize career-relevant mail
- Auto-advance application stages from real recruiter/ATS traffic
- Draft or send stage-aware replies with controllable autonomy
- Rate AI actions so the system improves per tenant
- Confirm outbound drafts in one place
- Get app + email notifications without polluting the in-app inbox with system mail

Separately, the agent app still carries weather demo code; logging is uneven; Mastra/evlog should track current recommended patterns.

---

## Solution (user-facing)

A **Career Inbox** with a **card hub** (Applications, Recruiters, Interviews, Offers, Unsorted, All mail, plus smart-rule cards), drill-in list/reader, Resend inbound and optional Gmail sync, Mastra classify (full auto CRM effects with undo + correct), reply-assist (always generate draft; Assist = confirm; Full = auto-send from AI settings), **`/dashboard/review`** for confirmation queue items, **Notifications** (app + optional email to user-chosen address), **AI settings** (providers, models per feature, autonomy), **Hub chat memory threads** (island list/restore/delete), **application calendar** of action events (country facet), Google OAuth for login/register and separate Gmail connect, device OTP to notification email, foundation logging + upgrades.

---

## Product intention

```text
Career OS
  ├── Evidence graph
  ├── Generated resumes
  ├── Applications (stages / outcomes / calendar events)
  ├── Career Inbox ← mail signal bus
  ├── Review queue ← human confirms drafts (and future confirmables)
  ├── Hub chat + memory threads
  └── AI platform (providers, models, autonomy, scorers, learning)
```

Mail is **hybrid**: Gmail-like craft where useful, **career-first** intelligence. Not a personal Gmail clone.

---

## Frozen decisions (grill log)

| #   | Topic                       | Decision                                                                                                                                                                  |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Product intent              | **Hybrid** Career Inbox (career-first AI; product chrome inspired by shadcn mail, not full Gmail parity)                                                                  |
| 2   | Job queue                   | **Redis only for queues**; sessions/auth stay Postgres (Better Auth)                                                                                                      |
| 3   | Mail hub                    | **Cards**: Applications, Recruiters, Interviews, Offers, Unsorted, All mail + **smart-rule cards** (count > 0)                                                            |
| 4   | CRM from mail               | **Full auto-apply** stage/labels/events + audit + **undo** + user **selects correct action** + learning                                                                   |
| 5   | Learning                    | Postgres corrections + few-shot; Mastra **feedback** + **datasets** + **scorers**; not model fine-tuning                                                                  |
| 6   | Memory                      | **Hub chat**: Mastra memory threads; collapsible **threads island**; list / restore / delete                                                                              |
| 7   | Threads island v1           | **Hub chat only** (not mail reply v1)                                                                                                                                     |
| 7b  | Reply                       | **Always generate draft**. Modes: **Assist** (confirm) \| **Full** (auto-send). No suggest-only empty draft                                                               |
| 8   | Auto-send control           | **AI settings only** — never notification settings                                                                                                                        |
| 9   | Reply default               | **Assist**                                                                                                                                                                |
| 10  | Confirm surface             | **`/dashboard/review`**: experiences-style list, Confirm CTA, drawer edit, side panel view                                                                                |
| 11  | Notifications               | **App + email** channels only; typed kinds by feature                                                                                                                     |
| 12  | Notification email          | User-assignable (account email, Gmail, …); system mail **To** that address                                                                                                |
| 13  | Security OTP                | Uses **same notification email**                                                                                                                                          |
| 14  | System mail in Career Inbox | **Hidden by default**; auto-filter via purpose flag + notification identity                                                                                               |
| 15  | Noise bucket name           | **Unsorted** (not spam)                                                                                                                                                   |
| 16  | AI models                   | Per-user **providers** + **model per feature**                                                                                                                            |
| 17  | Google auth                 | Login/register via Better Auth Google; **Gmail scopes separate** connect in settings                                                                                      |
| 18  | UI shell                    | Main surface card + **darker floating island**; same for Settings; minimal staggered fade-in                                                                              |
| 19  | UI stack                    | **coss** primitives + particles; design ref from shadcn mail at `/tmp/shadcn-mail-ref/mail-example` (do not clone 1:1; TanStack Start)                                    |
| 20  | Weather                     | **Remove** weather agent, tool, scorers, workflow, hub references                                                                                                         |
| 21  | Mastra conventions          | Expand `apps/agent/AGENTS.md`; register all agents/workflows/scorers; resume-import-style workflows                                                                       |
| 22  | Logging                     | Strengthen via `@tsu-stack/logger` only; agent app included; refactor existing; **evlog CLI**; upgrade **evlog** + **Mastra** to latest with Context7-verified migrations |
| 23  | Docs                        | Link-not-duplicate; root `Agents.md` links logging + Mastra AGENTS                                                                                                        |

---

## Domain vocabulary (see also CONTEXT.md)

| Term                         | Meaning                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| **Career Inbox**             | Tenant-scoped in-app mail product for hiring signal                                           |
| **Unsorted**                 | Mail with no system career label and no user smart-rule label                                 |
| **Smart rule**               | User-defined category (icon, title, description) injected into classify allowlist/prompt      |
| **Review item**              | Durable unit on `/dashboard/review` awaiting human confirm (e.g. reply draft)                 |
| **AI autonomy**              | Per-capability policy (reply: Assist \| Full; classify/CRM: full auto with undo)              |
| **Notification email**       | Destination for system emails (OTP, draft ready, etc.); not the Career Inbox product identity |
| **System notification mail** | Purpose-tagged messages that must not appear in default Career Inbox lists                    |
| **AI correction**            | User-selected correct action after an AI apply; drives few-shot + feedback + datasets         |

---

## Architecture

### High-level

```text
Ingress: Resend webhook | Gmail history sync
  → persist mail_message (tenant userId)
  → enqueue Redis job (classify | sync | …)
  → worker → Mastra workflow
  → effects: labels, CRM stage/events, review items, notifications
  → scorers (async) + optional feedback later

UI: surface card + darker island
  Mail hub cards → list/reader
  /dashboard/review → confirm drafts
  Settings: AI | Notifications | Connections
  Hub: threads island + chat
```

### Module seams (preferred test boundaries)

| Seam                  | Responsibility                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| **Mail ingress**      | Accept webhook/sync → normalized message + attachments storage               |
| **Mail query**        | Tenant-scoped list/read; **excludes** system notification purpose by default |
| **Classify workflow** | Rules + LLM JSON → labels + CRM effects + audit                              |
| **Reply workflow**    | Job context required → draft → Assist: review item + notify; Full: send      |
| **Review queue**      | List/confirm/edit/discard review items                                       |
| **Notifications**     | Persist app notification; optional email to notification address             |
| **AI settings**       | Providers, models/feature, autonomy; read by workers                         |
| **Learning**          | Corrections table + Mastra feedback/datasets + few-shot load                 |
| **Hub memory**        | Thread CRUD via Mastra memory APIs                                           |
| **Logging**           | Wide events via `@tsu-stack/logger`                                          |

Prefer testing at **oRPC/API and workflow I/O** over internal step mocks.

### Cost control

- Cheap prefilter before LLM classify
- Persist once; don’t re-classify same message
- Sample expensive scorers in prod
- Gmail History API deltas
- Redis for jobs only
- BYO AI keys per user (CONTEXT.md)

### Redis

- **In scope:** mail/AI job queues (e.g. BullMQ-class worker)
- **Out of scope day one:** session secondary storage, pub/sub for all notifications (app notifications via DB + client invalidation/poll first)

---

## UI

### Shared shell

1. Dashboard chrome (existing)
2. **Main surface card**
3. **Darker floating island** (coss `Card` variant of surface)
4. Primary content pane(s)
5. Minimal **staggered fade-in** (island → content)

Apply to: Mail, Settings, Hub threads (island = thread list).

### Mail

- **Hub:** category cards + smart-rule cards
- **Drill-in:** list + reader (resizable where appropriate); shadcn mail ref for density/actions only
- **Unsorted** first-class
- System notification mail **not** in default lists

### `/dashboard/review`

- Experiences-style **list** of pending review items
- Primary **Confirm** CTA (e.g. Send draft)
- **Drawer/Sheet** for edit before confirm
- **Side panel** for context view (mail thread, application, draft)
- Deep links from app notifications

### Settings island sections (additive)

| Section                   | Owns                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **AI**                    | Providers, keys, **model per feature**, reply Assist\|Full, classify/CRM autonomy if exposed |
| **Notifications**         | App on/off per kind; email channel; **notification email** address — **not** auto-send       |
| **Connections** (or Mail) | Gmail OAuth connect (mail scopes); not login-only Google                                     |

### Hub chat

- Collapsible **threads island**
- Default thread
- Restore full conversation; **delete** thread with confirm
- v1: hub only

### Applications calendar

- Action **events** on applications (mail-derived + manual stage changes)
- Views month/agenda; facet/filter by **country**
- Virtualize dense lists

---

## Backend capabilities

### Mail store

- Tenant `userId` on all rows
- Body/attachments durable (S3 per media-storage patterns)
- `purpose` / `isSystemNotification` for filtering
- Labels: system career set + smart-rule slugs
- Link optional `applicationId`

### Classify (Mastra workflow)

1. Cheap rules / smart rules
2. LLM structured output (allowlisted labels)
3. Full auto CRM stage/outcome/events when policy allows
4. Audit before/after + `traceId`
5. Live scorers; user can rate and **pick correct action** → undo + correction

### Reply (Mastra workflow + agent step)

1. **resolveJobContext** required
2. Load user context + few-shot corrections
3. Agent draft (tools for evidence/CRM read)
4. **Assist:** create review item + app notification (+ optional email)
5. **Full:** send after generation; notify “sent”
6. Job context missing → fail closed, no send

### Notifications

| Channel | Behavior                                                                 |
| ------- | ------------------------------------------------------------------------ |
| App     | Durable row; bell/list; toast policy by kind                             |
| Email   | Optional; **To** notification email; purpose = system → not Career Inbox |

Kinds include (non-exhaustive): `mail.reply.draft_ready`, `mail.classified.important`, `application.stage_auto`, `workflow.finished`, `security.new_device_otp`, …

### Google / Better Auth

- **Login/register:** Google OIDC basic scopes; invite-gated signup unchanged
- **Gmail:** separate connect with mail scopes; tokens on `account`
- Device trust: new machine → email OTP to **notification email**

### AI settings (per user)

```text
providers[]          # BYO keys, masked after save
models[feature]      # classify | reply | resumeImport | stacks | hubChat | scorer…
autonomy.mailReply   # assist | full
# classify/CRM: full auto-apply with undo (product default); optional future levels UI
```

### Learning loop

```text
AI apply → user rates / picks correct action
  → undo if needed
  → ai_correction (Postgres, userId)
  → mastra.observability.addFeedback(traceId, …)
  → dataset item (groundTruth)
  → next run: few-shot last K corrections for userId
```

### Logging foundation

- All durable logs via `@tsu-stack/logger` (never raw `evlog` from apps)
- Agent: init service logger; wide events per job/workflow; include `traceId` when present
- Refactor double-emit / post-emit bugs per `.agents/logging.md`
- Upgrade `evlog` + `@mastra/*` / `mastra` to latest; migrate with Context7 docs
- **evlog CLI:** `map`, `doctor`; workspace scripts; document in `.agents/logging.md` (or `evlog-cli` section); link from root `Agents.md`
- Remove weather completely from agent + hub supervisor

---

## User stories (selected; not exhaustive)

1. As a seeker, I want inbound recruiter mail categorized, so my Applications board stays current.
2. As a seeker, I want Unsorted for non-career noise, so the hub stays scannable.
3. As a seeker, I want smart rules with icon/title/description, so my taxonomy matches how I think.
4. As a seeker, I want wrong auto-stages undoable and correctable, so I trust full auto.
5. As a seeker, I want reply drafts always generated and held for confirm by default, so I never surprise-email a recruiter.
6. As a seeker, I want to enable auto-send only in AI settings, so notifications never silently change send policy.
7. As a seeker, I want `/dashboard/review` to list drafts needing confirm, so I clear a queue like a task list.
8. As a seeker, I want app + optional email notifications to my Gmail, so I catch draft-ready and security events.
9. As a seeker, I do not want system notification emails cluttering Career Inbox.
10. As a seeker, I want BYO providers and different models per feature, so cost/quality tradeoffs are mine.
11. As a seeker, I want Hub chat threads listable and deletable, so I can restore long conversations.
12. As a seeker, I want an application calendar of events by country, so I see hiring activity over time.
13. As a seeker, I want Google login and optional Gmail connect as separate steps.
14. As an operator, I want consistent Mastra conventions and no weather demo in production agent.
15. As an operator, I want evlog wide events and CLI coverage maps on agent and API paths.

---

## Implementation decisions (summary)

- Monorepo packages: `db` schemas, `core` contracts/enums/schemas, `api` oRPC, `email` send, `auth` Better Auth plugins, `web` UI, `agent` Mastra
- Queue worker process or agent-adjacent worker consuming Redis
- coss UI only for new surfaces; particles where they fit
- No direct `evlog` imports outside `@tsu-stack/logger`
- Multi-tenant: every domain row and every prompt few-shot scoped by `userId`
- Branch-friendly epics (see Delivery)

---

## Testing decisions

- Prefer behavior tests at API/workflow boundaries
- Classify: given fixture email → labels + stage effect + audit
- Reply Assist: creates review item, does not send
- Reply Full: sends when autonomy full and job context present
- Mail list: system notification purpose excluded by default
- Notification email filter: message matching notification identity not in hub
- Learning: correction appears in subsequent few-shot load (unit/integration)
- Logging: no double-emit on request path (existing middleware invariants)
- Prior art: resume-import workflow tests, applications CRM mutations

---

## Out of scope (this program)

- Full Gmail UI parity (stars/mute/keyboard-complete, multi-account polish)
- Threads island on mail reply in v1
- Fine-tuning foundation models from ratings
- Redis for sessions day one
- Google Calendar two-way sync (application calendar is product events first)
- Employer-side apply spam / marketplace
- Purchased shadcn UI Kit Pro source (use open shadcn mail ref in `/tmp` only)

---

## Delivery (epics / branches)

| Order | Epic                                                                   | Notes      |
| ----- | ---------------------------------------------------------------------- | ---------- |
| 0     | Upgrade evlog + Mastra; logging refactor; agent logger; evlog CLI docs | Foundation |
| 1     | Remove weather; expand `apps/agent/AGENTS.md`; link root Agents        | Foundation |
| 2     | Surface + island shell + Settings shell + fade                         | UI         |
| 3     | AI settings + notification settings + notification email               | Settings   |
| 4     | Mail hub UI (cards + drill-in)                                         | UI         |
| 5     | Mail backend + Redis queue + Resend inbound                            | Backend    |
| 6     | Classify workflow + scorers + corrections + undo                       | AI         |
| 7     | Smart rules + hub rule cards                                           | AI/UI      |
| 8     | Reply workflow + Assist/Full + `/dashboard/review`                     | AI/UI      |
| 9     | Notifications delivery + system mail filter                            | Backend/UI |
| 10    | Google login + Gmail connect                                           | Auth       |
| 11    | Hub threads island + memory                                            | AI/UI      |
| 12    | Application calendar + country                                         | CRM        |
| 13    | Device OTP → notification email                                        | Auth       |

After this program spec is approved: **`/to-tickets`** (or superpowers **`writing-plans`**) → tracer-bullet tickets with blocking edges → **`/implement`** / **`/tdd`** per ticket with fresh context.

---

## Skill path (Ask Matt + Superpowers)

| Phase               | Matt flow                               | Superpowers equivalent                               | Status                                      |
| ------------------- | --------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| Sharpen idea        | `/grill-with-docs` + `/domain-modeling` | `/brainstorming` + grilling                          | **Done** (this thread)                      |
| Spec                | `/to-spec`                              | Write `docs/superpowers/specs/…`                     | **This document**                           |
| Tickets             | `/to-tickets`                           | `/writing-plans`                                     | Next after user approves spec               |
| Build               | `/implement` + `/tdd`                   | `/subagent-driven-development` or `/executing-plans` | Per ticket, fresh context                   |
| Review              | `/code-review`                          | `/code-review` / `/requesting-code-review`           | End of each ticket                          |
| Cross-session       | `/handoff`                              | handoff skill                                        | If context near smart-zone                  |
| Fog / huge map only | `/wayfinder`                            | —                                                    | **Not required** — decisions already frozen |

**Do not** re-triage tickets produced by `/to-tickets`.

**Load when implementing a ticket (as relevant):** `mastra`, `coss`, `coss-particles`, `better-auth-best-practices`, `tanstack-*`, logging via `.agents/logging.md`, Context7 for evlog/Mastra upgrades.

---

## Further notes

- Design reference checkout: `/tmp/shadcn-mail-ref/mail-example` (ephemeral; re-fetch if missing).
- CONTEXT.md updated with Career Inbox terms in the same change as this spec.
- Historical hub-chat spec mentioning weather remains historical; implementation must not restore weather.

---

## Appendix: Observability sinks (evlog CLI + free-tier choices)

### Separation of concerns (important)

| Layer               | Role                                                               | Bound to CLI?                                 |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| **Runtime logging** | `@tsu-stack/logger` / evlog **wide events** (request/job outcomes) | No — drains configured in logger package      |
| **`@evlog/cli`**    | Static **map** / **doctor** / optional **init** scaffolding        | CLI only; never required at runtime           |
| **Error product**   | Exceptions, stack traces, source maps, optional session replay     | **Independent** of CLI — any SDK or self-host |

**Yes:** if Sentry (or any error tool) is used **only for errors**, it does **not** have to go through `evlog init` or an evlog drain. Wire the Sentry (or alternative) SDK in web/server/agent for uncaught exceptions and leave **wide events → Axiom** via the logger facade.

Conversely, sending every wide event _into_ Sentry as a log sink is optional and often wasteful on free tiers.

### What `@evlog/cli` actually supports for prod drains

`evlog init --prod-drain` is **not** limited to Axiom + Sentry. Documented destinations include at least:

| Id             | Destination                 |
| -------------- | --------------------------- |
| `axiom`        | Axiom                       |
| `sentry`       | Sentry                      |
| `otlp`         | Any OpenTelemetry collector |
| `posthog`      | PostHog                     |
| `better-stack` | Better Stack                |
| `datadog`      | Datadog                     |
| `hyperdx`      | HyperDX                     |
| `fs` / `none`  | Local files / console       |

Multiple prod drains can fan out the **same** wide event. Prefer implementing drains **behind `@tsu-stack/logger`**, not scattering `createAxiomDrain` in apps. Use `init --dry-run` as a recipe if useful.

CLI commands for coverage (orthogonal to SaaS choice):

| Command                                  | Use for us                                 |
| ---------------------------------------- | ------------------------------------------ |
| `evlog map --cwd apps/web`               | Score dark routes (TanStack Start adapter) |
| `evlog map --min-score N` / `--baseline` | CI ratchet                                 |
| `evlog doctor`                           | Install / sink health after upgrades       |
| `evlog telemetry disable`                | CLI privacy                                |

### Free-tier comparison (small projects, ~2026)

Numbers change; re-check vendor pages before locking production.

#### Wide events / logs (primary for this monorepo)

| Product      | Free-ish offer                                                                 | Best for                                                         |
| ------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Axiom**    | Personal plan order of magnitude **~25 GB ingest / mo**, **~30-day** retention | Structured wide events, APL query, multi-service `service=` tags |
| Sentry Logs  | Small free allotment on paid framing; not the reason to pick Sentry            | Secondary if already on Sentry                                   |
| Better Stack | Free tier often time-limited or lower volume                                   | Logs + uptime in one brand                                       |

**Primary free recommendation for wide events: Axiom.**

#### Error / exception products (optional; not required to be an evlog drain)

| Product              | Free generosity (approx.)                                             | Notes                                            |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| **Sentry Developer** | **5k errors / mo**, **1 user**, tiny replays (~50), some tracing      | Best crash UX; **seat limit** bites if >1 person |
| **Highlight.io**     | Free tier commonly **~1k sessions/mo** (+ error/replay style product) | More “session” oriented; check current quotas    |
| **GlitchTip**        | Self-host = **unlimited** (your infra cost)                           | Sentry-compatible API; ops burden                |
| **Better Stack**     | Free often short trial / limited                                      | Logs + incidents, not classic Sentry clone       |
| **Self-host Sentry** | Unlimited volume                                                      | Heavy ops; rarely worth it for solo              |

**More generous than Sentry free for raw error volume:**

1. **GlitchTip (or self-host Sentry)** if you accept ops — no vendor error cap.
2. **Highlight** may feel more generous for **session** quotas, not always for pure error counts — verify live.
3. **Sentry free** remains best _product_ for “exception → stack → release” with zero ops, but **least generous on seats** (1 user) and caps hard at 5k errors.

### Frozen observability decision for this program

| Concern                                                      | Choice                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wide events (mail, queue, agent jobs, review, notifications) | **Axiom** as primary sink via `@tsu-stack/logger`                                                                                                 |
| Sampling                                                     | Keep **errors 100%**; sample **info** when volume grows (evlog sampling presets)                                                                  |
| Exception / FE crash product                                 | **Optional.** Prefer **Sentry SDK** for UX if free 5k/1 seat is enough; explore **GlitchTip** if multi-user free or unlimited volume matters more |
| Wire error tool via `evlog init --prod-drain sentry`?        | **Not required.** Prefer dedicated SDK for errors so free quotas aren’t burned by wide-event spam                                                 |
| CLI                                                          | `@evlog/cli` for **map/doctor/CI**; not the source of truth for which error SaaS we pick                                                          |
| Agent                                                        | Wide events via logger → Axiom; Mastra traces stay Mastra/DuckDB/Studio                                                                           |

### Implementation notes (foundation epic)

1. Upgrade `evlog` + pin `@evlog/cli`; scripts `log:map`, `log:doctor`.
2. Axiom env: `AXIOM_DATASET`, `AXIOM_API_KEY` in server/agent deploy.
3. Do not force Sentry until a concrete need (sourcemaps, replay, multi-project issues).
4. If adding errors SaaS: one project per surface or tags `service=web|server|agent`.
5. Document chosen sinks in `.agents/logging.md` when implemented (link-only from root `Agents.md` already).
