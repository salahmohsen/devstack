# Mail backend wave — guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `20`–`26`  
**Depends on:** Mail UI mock (`11`–`13`), Settings wave (`14`–`19`)

## Goal (wave 4)

Persist tenant-scoped Career Inbox mail, expose protected list/get by category, accept Resend inbound with idempotency, and scaffold a Redis classify job queue. System notification mail stays **out of default lists**.

## Shipped when

| Seam                               | Behavior                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Core contracts                     | Categories, system labels, purpose flag, list/read schemas shared by API + web             |
| `mail_message` (+ attachment meta) | Tenant `userId`, labels, purpose, ingress idempotency keys, indexes                        |
| oRPC mail                          | Session-scoped list by category + get by id; **excludes** `system_notification` by default |
| Web mail                           | Drill-in list/reader uses real API; empty state when no rows (no mock fallback)            |
| Resend inbound                     | Webhook verifies signature (if Resend pattern), maps to tenant, persists, idempotent       |
| Classify queue                     | BullMQ (or repo Redis patterns) job scaffold for classify — worker can be stub             |

## Dependency graph

```text
20 (core) ──► 21 (db) ──► 22 (repo + oRPC list/get)
                              ├──► 23 (web wire-up)
                              └──► 24 (Resend webhook) ──► 25 (Redis classify queue)
26 (docs) after 22+; ideally after 23–25 land or stubbed
```

**Tracer-bullet order:** 20 → 21 → 22 → 23 (thin list) in parallel with 24 after 21; 25 after 22/24 can enqueue.

## Out of scope this wave

- Full Mastra **classify** workflow (labels + CRM effects + undo) — later epic
- Reply send / Review queue backend + UI
- Gmail OAuth connect / History sync
- Smart rules CRUD + hub rule cards from DB
- Notification delivery pipeline (bell + system mail send)
- Removing / changing AI model env keys

## Env notes (no secrets inventing)

| Variable                        | When                 | Notes                                                                                                                          |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                  | Always (existing)    | **Migrate only if host is `localhost` / `127.0.0.1`**                                                                          |
| `REDIS_URL`                     | Queue scaffold (25)  | Already used by server (ioredis cache + Socket.IO); queues reuse same Redis                                                    |
| `RESEND_API_KEY` / `EMAIL_FROM` | Outbound only today  | Existing BYO Resend for product mail                                                                                           |
| `RESEND_WEBHOOK_SECRET`         | Inbound webhook (24) | Required to verify Resend inbound signatures when 24 lands — wire via `@tsu-stack/env` when implementing; do not invent values |

## Multi-tenant rules

- Every `mail_message` row has `userId` from session (queries) or resolved tenant (webhook mapping).
- Never unscoped `findAll()` for private mail.
- Default mail query: `purpose != system_notification` (and not matching notification identity when that lands).

## Redis

- **In use today:** ioredis for GitHub cache + Socket.IO adapter (`apps/server`).
- **Wave 4:** add BullMQ-class queue for classify jobs only — do **not** invent a second Redis client stack if ioredis connection patterns already exist; share `REDIS_URL`.
- Sessions stay Postgres (Better Auth).

## Related UI

- Live category drill-in: `apps/web/src/pages/dashboard/mail/mail-category-page.tsx`
- Query wrappers: `apps/web/src/features/mail/` (`list-mail.query.ts`, `get-mail.query.ts`)
- Categories: applications, recruiters, interviews, offers, unsorted, all (+ future `rule:*`)
- Nav counts: active category shows `list.length` only (no unread aggregate yet)

## Progress

| Ticket            | Status  | Notes                                                 |
| ----------------- | ------- | ----------------------------------------------------- |
| 20 core           | done    | `packages/core/src/mail/`                             |
| 21 db             | done    | `mail_message` + attachments, migration applied local |
| 22 repo + oRPC    | done    | `mail.list` / `mail.get` protected                    |
| 23 web wire-up    | done    | Real list/get + empty state; mock fixtures only       |
| 24 Resend inbound | pending | Webhook + tenant map + idempotency                    |
| 25 classify queue | pending | BullMQ/redis scaffold after 22/24                     |
| 26 docs           | pending | After 22+; ideally after 23–25                        |
