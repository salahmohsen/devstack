import { Observability, SensitiveDataFilter } from "@mastra/observability";

import { NoopExporter } from "#@/observability/noop-exporter";

export const observability = new Observability({
  configs: {
    default: {
      serviceName: "portfolio-mastra",
      exporters: [new NoopExporter()],
      spanOutputProcessors: [new SensitiveDataFilter()]
    }
  }
});
