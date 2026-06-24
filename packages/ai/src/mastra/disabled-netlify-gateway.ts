/**
 * No-op Netlify gateway that suppresses the default Netlify AI Gateway
 * integration. The @mastra/core constructor skips default gateways when
 * a custom one with the same id is registered (see the `alreadyRegistered`
 * check in `Mastra`'s constructor), and the `buildProvidersList` handler
 * in @mastra/server's `/api/editor/builder/models/available` route only
 * calls `fetchProviders()` on registered gateways. With this no-op in
 * place the Netlify gateway never calls
 * `https://api.netlify.com/api/v1/ai-gateway/providers` (which was returning
 * `Bad Request` in this environment and spamming
 * `Failed to fetch providers from gateway "netlify"` to the server log).
 *
 * Re-enable by removing the `netlify: ...` entry from the `gateways`
 * record passed to `new Mastra({ ... })` in `mastra/index.ts` — the default
 * Netlify gateway will be re-registered.
 */
import { MastraModelGateway, type ProviderConfig } from "@mastra/core/llm";

export class DisabledNetlifyGateway extends MastraModelGateway {
  readonly id = "netlify";
  readonly name = "Netlify (disabled)";

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {};
  }

  buildUrl(): string {
    return "";
  }

  async getApiKey(): Promise<string> {
    return "";
  }

  async resolveLanguageModel(): Promise<never> {
    throw new Error("Netlify gateway is disabled in this deployment");
  }
}
