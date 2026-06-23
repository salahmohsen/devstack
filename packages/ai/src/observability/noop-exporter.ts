import { type TracingEvent } from "@mastra/core/observability";
import { BaseExporter } from "@mastra/observability";

/**
 * No-op exporter. Satisfies the Observability config validator (which requires
 * at least one exporter) without persisting spans. Cloudflare's platform
 * observability (apps/server/wrangler.jsonc:21-35) captures all spans with
 * full sampling; the D1 store in @mastra/cloudflare-d1@1.1.0 does not implement
 * the observability sub-store domain, so the built-in MastraStorageExporter
 * is a no-op anyway. See ADR-0008.
 */
export class NoopExporter extends BaseExporter {
  override name = "noop";

  protected override async _exportTracingEvent(_event: TracingEvent): Promise<void> {
    // Intentionally empty: spans are captured by Cloudflare's platform
    // observability via wrangler.jsonc. This exporter exists only to satisfy
    // Observability's "at least one exporter" validator.
  }
}
