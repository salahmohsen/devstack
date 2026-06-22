import { MastraStorageExporter, Observability, SensitiveDataFilter } from "@mastra/observability";

export const observability = new Observability({
  configs: {
    default: {
      serviceName: "portfolio-mastra",
      exporters: [new MastraStorageExporter()],
      spanOutputProcessors: [new SensitiveDataFilter()]
    }
  }
});
