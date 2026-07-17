# Self-Hosted Migration — Execution Guide

This directory contains the implementation plan for migrating
`personal-hub` from Cloudflare Workers to self-hosted infrastructure.

## Files

- [`plan.md`](./plan.md) — Primary plan. 20 numbered tasks. Each task has
  checkbox steps and inline code. **This is the main roadmap.**
- [`PITFALLS.md`](./PITFALLS.md) — **Read this before starting tasks
  3, 11, 17, 20.** It enumerates failure modes that bit me during
  the planning phase: missing `reflect-metadata`, contract stripping
  that's no longer needed, idempotent migration commands, etc.
- [`foldouts/`](./foldouts/) — Per-task foldouts with step-by-step
  canonical code ready for execution. Currently covers Tasks 3, 11,
  17, 20 (the four riskiest).

## Execution Order

The plan's 20 tasks are NOT simultaneous. Strict order:

1. Infrastructure (Tasks 1-2) — Docker Compose + Dockerfiles. NO
   service-level changes yet.
2. **NestJS bootstrap (Task 3)** — Read [`foldouts/task-03-nestjs-bootstrap.md`](./foldouts/task-03-nestjs-bootstrap.md) and
   [`PITFALLS.md`](./PITFALLS.md) first. This is the foundation.
3. Cross-cutting NestJS concerns (Tasks 4-6) — After Task 3, in
   order.
4. **oRPC contract.json for client (Task 7)** — Doesn't break the
   server, just adds build artifact.
5. Auth module (Task 8).
6. WebSocket gateway + controllers (Tasks 9-10, partial 13).
7. **Mastra integration (Task 11)** — Read [`foldouts/task-11-mastra-module.md`](./foldouts/task-11-mastra-module.md) and
   [`PITFALLS.md`](./PITFALLS.md) first. Tightly couples to Task 15
   in the same PR.
8. Media/Redis/Health modules (Tasks 12-14).
9. **Agent migration (Task 15)** — Same PR as Task 11.
10. Web migration (Task 16).
11. **Data migration (Task 17)** — Read
    [`foldouts/task-17-data-migration.md`](./foldouts/task-17-data-migration.md)
    first. Idempotent. Delete the script after use (Task 19).
12. MinIO bucket setup (Task 18).
13. Final cleanup (Task 19).
14. **Frontend OpenAPILink (Task 20)** — Read
    [`foldouts/task-20-openapi-link.md`](./foldouts/task-20-openapi-link.md)
    and [`PITFALLS.md`](./PITFALLS.md) first.

## Markers

Tasks use structured markers intended for automated executor agents
(e.g. `superpowers:subagent-driven-development` or a focused
reviewer):

- `@done-when:` — Terminal-block of arguments that ALL exit 0.
  Self-contained success criteria.
- `@verify:` — Optional sanity checks during execution (run as
  needed, not blocking).
- `@blocker-if:` — Pre-conditions for the task. If any of these
  aren't true, the task should NOT start.

The current `plan.md` does not yet have these markers embedded
inline. Each foldout has them. The `PITFALLS.md` is supplemental
text.

## Architectural Lock

Four ADRs anchor the decisions; do NOT revisit unless grounded
reasons emerge:

- **ADR-0018** — Collapse `server` + `agent` into one NestJS process.
- **ADR-0019** — `@Implement(appRouter.x)` reuse + `OpenAPILink` client.
- **ADR-0020** — Mastra observability via StorageExporter + OtelBridge.
- **ADR-0021** — `@socket.io/redis-adapter` for cross-instance signal broadcast.

Each ADR is in `/docs/adr/0018-…md` through `0021-…md`.

## Verification Strategy

For each task, the executor MUST run `@done-when` commands before
producing a commit. If any command fails:

1. Stop. Do NOT push a broken commit.
2. Reread the relevant `PITFALLS.md` entry.
3. Reread the relevant `foldouts/<task>`.
4. If still stuck, escalate to the user.

There is no "spinning wheel of edits" — stop and ask.
