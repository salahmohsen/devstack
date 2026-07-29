# Career Inbox + AI platform — tickets

**Spec (approved):** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tracker:** local markdown under `issues/`

## Waves

| Wave                 | Focus                                          | Tickets   | Status   |
| -------------------- | ---------------------------------------------- | --------- | -------- |
| **0 — Foundation**   | Upgrades, logging, Axiom, CLI                  | `01`–`06` | **Done** |
| **1 — Shell**        | Surface + island + settings                    | `07`–`10` | **Done** |
| **2 — Mail UI**      | Hub cards + drill-in (mock)                    | `11`–`13` | **Done** |
| **3 — Settings**     | AI settings + notification settings            | `14`–`19` | **Done** |
| **4 — Mail backend** | Core + DB + list API + Resend + queue scaffold | `20`–`26` | **Done** |
| **5 — Classify**     | Heuristic + worker + Mastra LLM path           | `27`–`30` | **Done** |

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

## Next frontier

**CRM from classify** (stage/events + undo + corrections). Then reply/Review queue, Gmail OAuth sync, smart rules CRUD.
