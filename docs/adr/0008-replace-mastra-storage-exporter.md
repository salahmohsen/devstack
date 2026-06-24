# 0008 — Replace `MastraStorageExporter` with a no-op `BaseExporter`

> **Superseded by the Mastra Cloud approach (see `.agents/mastra.md` §5 and
> `docs/dev/mastra-studio.md`).** The `NoopExporter` was deleted; the
> `MastraPlatformExporter` (which auto-disables when
> `MASTRA_PLATFORM_ACCESS_TOKEN` is unset) is the new default. Kept for
> history.

`MastraStorageExporter` (in `@mastra/observability`) calls `mastra.getStorage().getStore("observability")` at init. The D1 store shipped in `@mastra/cloudflare-d1@1.1.0` implements only `BackgroundTasksStorageD1`, `MemoryStorageD1`, `ScoresStorageD1`, and `WorkflowsStorageD1` — no `ObservabilityStorageD1` domain. So the exporter logs `MastraStorageExporter disabled: Observability storage not available. Traces will not be persisted.`, bails, and does not persist any spans.

Removing the exporter outright (`exporters: []`) is invalid — `Observability`'s constructor enforces at least one exporter or `bridge`. So we keep the no-op behavior by replacing it with a tiny custom `BaseExporter` subclass that satisfies the validator while doing nothing.

Cloudflare's platform observability already captures every span: `apps/server/wrangler.jsonc:21-35` configures `observability.enabled = true` with `traces.enabled = true`, `traces.persist = true`, and `traces.head_sampling_rate = 1`. Every span Mastra creates is also visible in `wrangler tail` and the Cloudflare dashboard.

The alternative (switching to `PostgresStore` for observability) reverts part of ADR-0002 for noise. PostgresStore would start persisting spans — into a DB already serving the transactional app, on the same WebSocket pool, on a tier that charges for storage — to back a query that won't be written in the next 90 days. The data is already in Cloudflare.

Follow-up: re-evaluate when `@mastra/cloudflare-d1` ships an observability domain, or when a custom exporter (e.g. Cloudflare Analytics Engine adapter) makes sense. Until then, `apps/server/wrangler.jsonc` observability config is the single source of truth for span visibility.
