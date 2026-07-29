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
| Resend inbound                     | BYO per user: Settings → Mail secrets; `POST /webhooks/resend/:token`; idempotent persist  |
| Mail settings                      | Sealed Resend API key + webhook secret, inbound address, enable toggle, rotate URL         |
| Classify queue                     | BullMQ on `REDIS_URL`; producer from webhook; worker stub logs payload                     |

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

| Variable                        | When                       | Notes                                                                                                          |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Always (existing)          | **Migrate only if host is `localhost` / `127.0.0.1`**                                                          |
| `REDIS_URL`                     | Queue scaffold (25)        | Shared: GitHub cache + Socket.IO + BullMQ classify. Without it, enqueue is no-op and worker is not started.    |
| `RESEND_API_KEY` / `EMAIL_FROM` | Outbound product/auth mail | Platform/operator Resend for product mail only — **not** Career Inbox inbound                                  |
| (per-user sealed)               | Career Inbox inbound (24)  | Resend API key + webhook signing secret on `user_mail_settings` (Settings → Mail). No platform inbound secret. |

## Multi-tenant rules

- Every `mail_message` row has `userId` from session (queries) or resolved tenant (webhook mapping).
- Never unscoped `findAll()` for private mail.
- Default mail query: `purpose != system_notification` (and not matching notification identity when that lands).

## Redis / classify queue

- **In use:** ioredis for GitHub cache + Socket.IO adapter (`apps/server`).
- **Classify:** BullMQ queue `mail-classify`, job `classify-message`, payload `{ messageId, userId, enqueuedAt? }`.
- **Producer:** `enqueueMailClassify` from Resend webhook after successful persist (not on duplicate).
- **Worker:** same `apps/server` process when `REDIS_URL` is set — stub logs `mail_classify_job_stub` (Mastra later).
- **Code:** `apps/server/src/queues/mail-classify-queue.ts`, contracts in `packages/core/src/mail/classify-queue.ts`.
- Sessions stay Postgres (Better Auth).

## Related UI

- Live category drill-in: `apps/web/src/pages/dashboard/mail/mail-category-page.tsx`
- Query wrappers: `apps/web/src/features/mail/` (`list-mail.query.ts`, `get-mail.query.ts`)
- Settings BYO Resend: `apps/web/src/pages/dashboard/settings/ui/mail-settings.tsx`
- Categories: applications, recruiters, interviews, offers, unsorted, all (+ future `rule:*`)
- Nav counts: active category shows `list.length` only (no unread aggregate yet)

## Progress

| Ticket            | Status | Notes                                                 |
| ----------------- | ------ | ----------------------------------------------------- |
| 20 core           | done   | `packages/core/src/mail/`                             |
| 21 db             | done   | `mail_message` + attachments, migration applied local |
| 22 repo + oRPC    | done   | `mail.list` / `mail.get` protected                    |
| 23 web wire-up    | done   | Real list/get + empty state; mock fixtures only       |
| 24 Resend inbound | done   | BYO Settings → Mail + `/webhooks/resend/:token`       |
| 25 classify queue | done   | BullMQ `mail-classify` producer + worker stub         |
| 26 docs           | done   | This file + program README                            |
