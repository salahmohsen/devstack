# Shared job pool plus a company table

DevHub fills New jobs from public adapters into a shared `job_posting` pantry, then serves each tenant a personal `application` plate. We keep that split. We do not store a full copy of every listing per user. Dead listings are a close/prune problem, not a reason to drop the pantry.

Employers become their own row (`job_company`, keyed by slug). A posting points at a company. Years required stay on the posting (a role trait, not a company trait). Logo URL lives on the company and may be copied onto cards.

## Status

accepted

## Considered options

- Per-user-only listings: duplicates Stripe for every tenant, wastes fetch and BYO AI.
- Extra columns on `job_posting` only: no shared profile, messy name matching.
- Snapshot logo/years only on `application`: two users, two copies, no company page.

## Consequences

- Ingest upserts posting + company. Land/evaluate still write `application`.
- Liveness sets `closedAt` and `closedReason`. After 90 days closed, delete the pantry row only if no application references it. Tracked history must survive (`postingId` on delete set null).
- Amends the 2026-08-15 product map slot that deferred a company table.
