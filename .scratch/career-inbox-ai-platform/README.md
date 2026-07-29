# Career Inbox + AI platform — tickets

**Spec (approved):** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tracker:** local markdown under `issues/`  
**Label:** `ready-for-agent`  
**Process:** work the **frontier** (no open blockers) with `/implement` + `/tdd`; clear context between tickets; `/code-review` before merge. Prefer Superpowers `writing-plans` per non-trivial ticket.

## Waves

| Wave               | Focus                                          | Tickets   | Status                   |
| ------------------ | ---------------------------------------------- | --------- | ------------------------ |
| **0 — Foundation** | Upgrades, weather removal, logging, Axiom, CLI | `01`–`06` | **Done** (merged `main`) |
| **1 — Shell**      | Surface + island + settings shell + fade       | `07`–`10` | **Ready**                |
| **2+**             | Mail, review, AI, notifications, …             | TBD       | After shell              |

## Shell frontier (start here)

| #      | Title                                      | Blocked by |
| ------ | ------------------------------------------ | ---------- |
| **07** | Shared dashboard surface shell (main card) | None       |
| 08     | Darker floating island card primitive      | 07         |
| 09     | Settings layout: island nav + content pane | 07, 08     |
| 10     | Shell tokens, docs, and reuse contract     | 09         |

**Recommended start order:** `07` → `08` → `09` → `10`.

Guide: [SHELL.md](./SHELL.md)

## Foundation (done)

| #     | Title                                | Status |
| ----- | ------------------------------------ | ------ |
| 01–06 | See [FOUNDATION.md](./FOUNDATION.md) | done   |

PostHog product/error SDKs still later (with AI/notifications settings), not shell.
