# Scan job alerts (manual harvest)

**Status:** approved via product discussion (New jobs placement + URL dedup)  
**Date:** 2026-08-12

## Goal

Let the seeker trigger harvest from the **New jobs** page without waiting for automatic classify → harvest, without creating duplicate applications.

## Behavior

1. User clicks **Scan job alerts** on New jobs (header + empty state).
2. Server finds the user's recent Career Inbox messages labeled `job_notifier` (cap N).
3. For each message, enqueue the existing mail job-harvest worker (`runMailJobHarvest`).
4. Harvest create path stays **`createIfAbsentByUrl`** — unique `(userId, url)` prevents doubles (inbox / tracked / dismissed).
5. UI toast summarizes enqueue result; list invalidates so new inbox rows appear as workers finish.

## Non-goals

- Soft-save below minMatchScore
- Fuzzy title+company dedup
- Full Gmail sync as part of this button (v1: harvest existing digests only)
- Sidebar control

## API

`applications.scanJobAlerts` (protected):

**Input:** optional `{ limit?: number }` (default 20, max 40)

**Output:**

```ts
{
  digestsFound: number;
  enqueued: number;
  queueUnavailable: boolean;
}
```

## Dedup

Unchanged: canonicalize URL → `createIfAbsentByUrl` → `skippedDuplicate` when row exists.

Manual re-enqueue uses a **distinct BullMQ jobId** so completed harvests can run again; create still no-ops on URL conflict.

## UI

- New jobs `PageHeader` outline button **Scan job alerts**
- Empty inbox secondary action same control
- Loading on button; toast: “Scanning N digests…” / “No job-alert digests yet” / queue-down message
- Invalidate applications list (`inbox`) + inbox count after success
