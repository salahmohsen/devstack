import { MastraPlatformExporter, Observability, SensitiveDataFilter } from "@mastra/observability";

/**
 * Mastra observability configuration.
 *
 * - `MastraPlatformExporter` ships spans/logs/metrics to the hosted Mastra
 *   observability surface when `MASTRA_PLATFORM_ACCESS_TOKEN` is set. The
 *   exporter auto-disables (no-op) when the env var is missing, so dev and
 *   production share the same exporter list. To view traces, open the Mastra
 *   Cloud project at `https://mastra.ai` — the local Studio observability tab
 *   is intentionally empty in this setup.
 *
 * The `SensitiveDataFilter` is a span output processor that redacts secrets
 * (API keys, tokens, passwords, etc.) before they reach any exporter. It is
 * also auto-applied to every config by the `Observability` registry; we list
 * it explicitly here so the `set({ handler: "observability" })` log line in
 * the dev server makes the redaction surface obvious.
 */
export const observability = new Observability({
  configs: {
    default: {
      serviceName: "portfolio-mastra",
      exporters: [new MastraPlatformExporter()],
      spanOutputProcessors: [new SensitiveDataFilter()]
    }
  }
});
