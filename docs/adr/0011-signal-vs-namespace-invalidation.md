# 0011 — Revalidation signals and cache namespaces are different invariants about the same event

The GitHub cache uses two parallel mechanisms to track staleness, both written
by the same webhooks and admin paths:

- **Signals** (`github_revalidation_signal`) — a per-topic event log keyed by
  `signal_key` with a `updated_at` timestamp. Staleness rule: a cached row
  with `fetchedAt < signal.updatedAt` is stale.
- **Namespaces** (`github_cache_namespace`) — a per-group version counter
  keyed by `namespace` with a monotonic `version` integer. Staleness rule:
  a cached row whose `namespaceVersion !== currentVersion` is stale.

They are _not_ the same mechanism with two names. Signals are
time-relative: a row created before the signal is stale, a row created
after is fresh. Namespaces are monotonic: a row tagged at `version N` is
stale forever once the namespace reaches `version N+1` (or higher), even
if no specific event happened to the data after the row was created. The
three call sites reflect this split deliberately:

- **Webhooks** (`handle-github-webhook.ts:67-68`): write the same key
  strings to both tables because a webhook event invalidates _both_
  invariants — the metadata counter and the content timestamp. The fact
  that `getGitHubWebhookSignalKeys` returns the same set as
  `getGitHubWebhookNamespaceKeys` is correct, not redundant.
- **`refreshInstallationAccess`** (`packages/api/src/routers/github/index.ts:123-129`):
  signals only. `installationAccess` is a topic without a cache-group
  version to bump.
- **`clearViewerCache`** (`packages/api/src/routers/github/index.ts:130-152`):
  4 signal keys (topics) + 9 namespace keys (cache groups), no overlap —
  the two sets target different things.

## The transactional fix

`markRevalidationSignals` and `bumpNamespaceVersion` were called as two
separate auto-commit statements inside the webhook handler, the admin
`clearViewerCache` route, and `refreshInstallationAccess`. A failure
between them left the cache half-invalidated (signals claimed stale,
namespace not bumped, or vice versa). The fix wraps both writes in a
single `getDb().transaction(async (tx) => { ... })` in
`handle-github-webhook.ts:67-71` and in the two admin routes in
`packages/api/src/routers/github/index.ts:123-152`. The relay broadcast
stays outside the transaction — it is a downstream effect on volatile
state, not a source of truth, and a transaction rollback must not
trigger a phantom invalidation.

## `now()` over `new Date()`

`markRevalidationSignals` and `bumpNamespaceVersion` previously set
`updated_at = new Date()` in the `onConflictDoUpdate` SET clause. With
the bulk-upsert and executor refactor in this change, the SET clause is
`updated_at = now()` — the database's transaction-start time. This
removes client-clock skew and gives a consistent ordering for
`findLatestRevalidationSignalAt`, which `getGitHubResourceLocalFirst`
reads on every cache miss. The relay broadcast does not compare
timestamps, so this is a strict improvement with no downside. The
`sql\`now()\`` value is the transaction-start timestamp, not the commit
timestamp; two concurrent transactions are still distinguished by their
start time, which is monotonic enough for the staleness comparison.

## Considered options

- **Collapse signals + namespaces into a single table.** Rejected: the
  staleness semantics genuinely differ (time-relative vs monotonic), and
  merging them would force one or the other to be emulated. The current
  shape is two invariants about the same event; collapsing would lose
  the difference.
- **Make `clearViewerCache` and `refreshInstallationAccess` use the
  same pattern.** Rejected: each route's key set reflects the
  distinct meanings of signals vs namespaces. Forcing symmetry would
  either bump a version counter for a topic that has no group, or
  mark a topic for a cache group that has no listeners. The current
  asymmetry is the documentation, not a bug.
