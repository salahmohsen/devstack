# Scan Job Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manual **Scan job alerts** on New jobs that re-runs harvest for `job_notifier` digests without duplicating applications.

**Architecture:** Register a harvest enqueue hook from `apps/server` (same pattern as classify). API lists recent `job_notifier` mails and enqueues harvest with force job ids. Create path remains `createIfAbsentByUrl`. Web mutation + header/empty-state button.

**Tech Stack:** oRPC, BullMQ, TanStack Query, existing mail harvest queue

---

### Task 1: Harvest enqueue hook + force re-run job ids

**Files:**

- Create: `packages/api/src/lib/mail/harvest-enqueue-hook.ts`
- Modify: `apps/server/src/queues/mail-job-harvest-queue.ts`
- Modify: `apps/server/src/index.ts`

- [x] Register hook like classify
- [x] Support `force: true` → unique jobId so manual re-scan re-runs
- [x] Wire register at server boot

### Task 2: Core + API scanJobAlerts

**Files:**

- Modify: `packages/core/src/application/types.ts` (or mail types)
- Modify: `packages/api/src/routers/applications.router.ts`
- Maybe: `packages/db` list helper if needed

- [x] Input/output schemas
- [x] List job_notifier messages for user (limit)
- [x] Enqueue each via hook
- [x] Return digestsFound / enqueued / queueUnavailable

### Task 3: Web mutation + New jobs UI

**Files:**

- Create: `apps/web/src/features/applications/api/scan-job-alerts.mutation.ts`
- Modify: `apps/web/src/features/applications/index.ts`
- Modify: `apps/web/src/pages/dashboard/new-jobs/new-jobs-page.tsx`

- [x] Mutation invalidates inbox list + count
- [x] Header + empty-state button
- [x] Toast copy

### Task 4: Verify + commit

- [ ] `vp check` on touched packages
- [ ] Commit
