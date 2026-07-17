# Mastra Observability via StorageExporter + OtelBridge

Production observability for the in-process Mastra agent uses two
exporters side-by-side:

1. `MastraStorageExporter` — stores traces in the Postgres DB backing
   the Mastra `PostgresStore`. Studio reads them locally.
2. `OtelBridge` — exports Mastra spans through Node's
   `@opentelemetry/sdk-node` configured in `instrumentation.js`. The
   bridge "inherits context from active OTEL spans", so a request that
   hits NestJS's tracing span -> Mastra tool call -> LLM call ->
   Postgres query produces one distributed trace across NestJS +
   Mastra + storage.

The two configurations co-exist on the same `mastra` instance via
`Observability.configs` (separate `default` + `otel-bridge` configs)
and the `configSelector`. The Node SDK runs in `apps/server` only —
not in `web` or `auth`.

Why both: StorageExporter persists traces for local Studio inspection
(Mastra's dev UI is the only direct Mastra UI) without depending on a
running collector. OtelBridge provides the unified NestJS-Mastra trace
that the collapse-into-single-process architecture (ADR-0018) was
chosen to enable. Removing either one reverts a specific capability:
StorageExporter -> Studio-local traces; OtelBridge -> one continuous
trace across NestJS + Mastra (fallback to two separate traces by
service name).

The OtelBridge requires an OTLP-collecting container (otel-collector,
Grafana Agent, Jaeger All-In-One). We commit to using one in the
self-hosted deployment; the choice of vendor is left to environment
configuration.
