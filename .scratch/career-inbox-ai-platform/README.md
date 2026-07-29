# Career Inbox + AI platform — tickets

**Spec (approved):** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tracker:** local markdown under `issues/`

## Waves

| Wave                       | Focus                                             | Tickets   | Status   |
| -------------------------- | ------------------------------------------------- | --------- | -------- |
| **0 — Foundation**         | Upgrades, logging, Axiom, CLI                     | `01`–`06` | **Done** |
| **1 — Shell**              | Surface + island + settings                       | `07`–`10` | **Done** |
| **2 — Mail UI**            | Hub cards + drill-in (mock)                       | `11`–`13` | **Done** |
| **3 — Settings**           | AI settings + notification settings               | `14`–`19` | **Done** |
| **4 — Mail backend**       | Core + DB + list API + Resend + queue scaffold    | `20`–`26` | **Done** |
| **5 — Classify**           | Heuristic + worker + Mastra LLM path              | `27`–`30` | **Done** |
| **6 — CRM from mail**      | Label → stage effects + audit + undo              | `31`–`36` | **Done** |
| **7 — Match unlinked**     | Company match / auto-create application from mail | `37`–`40` | **Done** |
| **8 — Review queue**       | Reply drafts + `/dashboard/review` confirm path   | `41`–`46` | **Done** |
| **9 — Outbound reply**     | Resend send on confirm + Full auto-send           | `47`–`49` | **Done** |
| **10 — App notifications** | Durable bell + emit on classify/CRM/draft         | `50`–`53` | **Done** |
| **11 — Connections**       | Settings Connections + Google/Gmail OAuth         | `54`      | **Done** |
| **12 — Gmail sync**        | History/list import into Career Inbox             | `55`–`56` | **Done** |
| **13 — Smart rules**       | CRUD + keyword classify + hub nav                 | `57`–`58` | **Done** |

## Mail UI (done)

See [MAIL.md](./MAIL.md) — mock hub at `/dashboard/mail`.

## Settings wave (done)

See [SETTINGS.md](./SETTINGS.md) — `/dashboard/settings/ai` + `/dashboard/settings/notifications`.

## Mail backend (done)

See [MAIL-BACKEND.md](./MAIL-BACKEND.md) — contracts, `mail_message`, list/get, BYO Resend inbound, Redis classify scaffold.

| Ticket | Title                           | Status   |
| ------ | ------------------------------- | -------- |
| `20`   | Core contracts                  | **Done** |
| `21`   | `mail_message` DB               | **Done** |
| `22`   | Repository + oRPC list/get      | **Done** |
| `23`   | Web wire-up                     | **Done** |
| `24`   | Resend inbound (BYO + settings) | **Done** |
| `25`   | Redis classify queue scaffold   | **Done** |
| `26`   | Wave docs                       | **Done** |

## Classify (wave 5)

| Ticket | Title                     | Status   |
| ------ | ------------------------- | -------- |
| `27`   | Classify core + heuristic | **Done** |
| `28`   | Persist classification    | **Done** |
| `29`   | Worker heuristic path     | **Done** |
| `30`   | Mastra LLM workflow       | **Done** |

## CRM from classify (wave 6)

See [CRM-FROM-CLASSIFY.md](./CRM-FROM-CLASSIFY.md).

| Ticket | Title                      | Status   |
| ------ | -------------------------- | -------- |
| `31`   | Effect contracts (core)    | **Done** |
| `32`   | Apply audit DB             | **Done** |
| `33`   | Apply from classify worker | **Done** |
| `34`   | Undo oRPC                  | **Done** |
| `35`   | Reader undo UI             | **Done** |
| `36`   | Wave docs                  | **Done** |

## Match unlinked mail (wave 7)

| Ticket | Title                         | Status   |
| ------ | ----------------------------- | -------- |
| `37`   | Match contracts (core)        | **Done** |
| `38`   | Match/create in CRM worker    | **Done** |
| `39`   | Undo deletes auto-created app | **Done** |
| `40`   | Wave docs                     | **Done** |

## Review queue (wave 8)

See [REVIEW.md](./REVIEW.md).

| Ticket | Title                         | Status   |
| ------ | ----------------------------- | -------- |
| `41`   | Core contracts                | **Done** |
| `42`   | `review_item` DB              | **Done** |
| `43`   | oRPC review router            | **Done** |
| `44`   | Draft from classify + mail UI | **Done** |
| `45`   | `/dashboard/review` page      | **Done** |
| `46`   | Wave docs                     | **Done** |

## Outbound reply (wave 9)

| Ticket | Title                          | Status   |
| ------ | ------------------------------ | -------- |
| `47`   | `sendCareerReply` (BYO/env)    | **Done** |
| `48`   | Confirm = send; Full auto-send | **Done** |
| `49`   | Docs + Review UI “Send reply”  | **Done** |

## App notifications (wave 10)

See [NOTIFICATIONS.md](./NOTIFICATIONS.md).

| Ticket | Title          | Status   |
| ------ | -------------- | -------- |
| `50`   | Core + DB      | **Done** |
| `51`   | oRPC + emit    | **Done** |
| `52`   | Topbar bell UI | **Done** |
| `53`   | Wave docs      | **Done** |

## Connections (wave 11)

See [CONNECTIONS.md](./CONNECTIONS.md).

| Ticket | Title                               | Status   |
| ------ | ----------------------------------- | -------- |
| `54`   | Settings Connections + Google/Gmail | **Done** |

## Gmail sync (wave 12)

| Ticket | Title                          | Status   |
| ------ | ------------------------------ | -------- |
| `55`   | Cursor table + Gmail import    | **Done** |
| `56`   | Sync button + classify enqueue | **Done** |

## Smart rules (wave 13)

See [SMART-RULES.md](./SMART-RULES.md).

| Ticket | Title                            | Status   |
| ------ | -------------------------------- | -------- |
| `57`   | Core/DB/API + classify keywords  | **Done** |
| `58`   | Settings Rules UI + mail hub nav | **Done** |

## Email notification channel (wave 14)

See [NOTIFICATIONS.md](./NOTIFICATIONS.md).

| Ticket | Title                         | Status   |
| ------ | ----------------------------- | -------- |
| `59`   | Resend email on channel prefs | **Done** |
| `60`   | Wave docs                     | **Done** |

## Next frontier

**Learning / corrections** · Mastra reply agent · scheduled Gmail sync · digest batching
