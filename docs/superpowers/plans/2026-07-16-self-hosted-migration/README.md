# Self-Hosted Migration — Execution Guide

This directory contains the implementation plan for migrating
`personal-hub` from Cloudflare Workers to self-hosted infrastructure
with Hono on Node.js.

## Strategy

Keep the existing Hono app architecture. Replace Cloudflare-specific
bindings (KV, R2, Durable Objects) with Node.js equivalents (Redis,
MinIO, Socket.IO). Run on Node.js via `@hono/node-server`.

## Files

- [`plan.md`](./plan.md) — Primary plan. 14 numbered tasks. Each task has
  checkbox steps and inline code. **This is the main roadmap.**

## Execution Order

The 14 tasks are sequential. Strict order:

1. **Infrastructure (Tasks 1-2)** — Docker Compose + Dockerfiles.
2. **Node.js entry point (Task 3)** — Add `@hono/node-server`, create `node.ts`.
3. **Service adapters (Tasks 4-6)** — Redis cache, MinIO media, Socket.IO gateway.
4. **Application updates (Tasks 7-8)** — Agent worker communication, webhook handler.
5. **App migrations (Tasks 9-10)** — Agent and web from CF to Node.js.
6. **Supporting work (Tasks 11-13)** — Env vars, data migration, health checks.
7. **Cleanup (Task 14)** — Remove temporary scripts, update gitignore.

## Markers

Tasks use structured markers:

- `@done-when:` — Terminal success criteria.
- `@verify:` — Optional sanity checks.
- `@blocker-if:` — Pre-conditions that must be true.

## Verification Strategy

For each task, run `@done-when` commands before committing. If any
command fails, stop and fix before proceeding.
