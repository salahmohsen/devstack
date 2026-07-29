# Career Inbox + AI platform — tickets

**Spec (approved):** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tracker:** local markdown under `issues/`  
**Label:** `ready-for-agent`  
**Process:** work the **frontier** (no open blockers) with `/implement` + `/tdd`; clear context between tickets; `/code-review` before merge.

## Waves

| Wave               | Focus                                          | Tickets              |
| ------------------ | ---------------------------------------------- | -------------------- |
| **0 — Foundation** | Upgrades, weather removal, logging, Axiom, CLI | `01`–`06`            |
| **1 — Shell**      | Surface + island + settings shell (later)      | TBD after foundation |
| **2+**             | Mail, review, AI, notifications, …             | TBD                  |

## Foundation frontier (start here)

| #   | Title                                                | Blocked by                                 |
| --- | ---------------------------------------------------- | ------------------------------------------ |
| 01  | Upgrade evlog + pin `@evlog/cli` + workspace scripts | None                                       |
| 02  | Upgrade Mastra packages + fix agent build            | None                                       |
| 03  | Remove weather example from agent                    | None (prefer after 02 if Mastra API churn) |
| 04  | Wire `@tsu-stack/logger` in agent app                | 01, 02                                     |
| 05  | Axiom drain behind logger facade (env-gated)         | 01                                         |
| 06  | Logging hygiene + map baseline for web               | 01                                         |

**Recommended start order:** `01` ‖ `02` → `03` → `04` ‖ `05` → `06`.

PostHog product/error SDKs are **not** foundation — schedule after shell or with notifications settings unless free capacity.
