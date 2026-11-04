# Job discovery reliability

Authorized scope: repair the production failure and all findings from the investigation, checking the live Freehire contract before changes. Do not change saved account preferences.

1. Reproduce transport failures and verify current OpenAPI and live response shapes.
2. Add persisted tenant-scoped run tracking with atomic active-run coalescing and per-candidate outcomes. Search errors must fail, retry transient errors with bounded backoff, and retain sanitized network diagnostics. Backfills reuse the successful fetch and do not re-score an attempted candidate within a run.
3. Preserve structured geography and salary period. Use Freehire's separate remote/local geography parameters. Apply the existing monthly salary floor locally in the same currency with known periods, explicitly explaining unknown/different-currency behavior. Treat source contract drift as an actionable error rather than silently broadening.
4. Replace inbox-count polling and guessed messages with authoritative run stages/counts and terminal outcomes on dashboard and hub entry points. Expose last successful sync, current/next run, failure and retry information.
5. Validate meaningful failure/recovery, concurrent enqueue, tenant access and UI status behavior. Run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md), produce a fresh hardening report and append generic lessons to its LESSONS.md. Run required workspace checks and relevant build checks. Report production transport/deployment boundaries honestly.

No cache fallback is enabled: stale jobs must not masquerade as fresh results. Existing cached snapshots are preserved after failed fetches.
