#!/usr/bin/env node
/**
 * Sync packages/core AI provider catalog from the installed @mastra/core registry.
 *
 * Run from repo root or apps/agent:
 *   node apps/agent/scripts/sync-mastra-provider-catalog.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = resolve(__dirname, "..");
const repoRoot = resolve(agentRoot, "../..");

function findRegistry() {
  const candidates = [
    join(agentRoot, "node_modules/@mastra/core/dist/provider-registry.json"),
    join(repoRoot, "node_modules/@mastra/core/dist/provider-registry.json"),
    join(repoRoot, "apps/agent/node_modules/@mastra/core/dist/provider-registry.json")
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Could not find @mastra/core/dist/provider-registry.json. Install apps/agent deps first."
  );
}

const regPath = findRegistry();
const reg = JSON.parse(readFileSync(regPath, "utf8"));

const providers = Object.entries(reg.providers)
  .map(([id, p]) => {
    const env = p.apiKeyEnvVar;
    const apiKeyEnvVars = Array.isArray(env) ? env : env ? [env] : [];
    return {
      id,
      name: p.name || id,
      apiKeyEnvVars,
      models: [...(p.models || [])].sort((a, b) => a.localeCompare(b))
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const outPath = join(repoRoot, "packages/core/src/ai-settings/mastra-provider-catalog.ts");

const body = `/**
 * Generated from @mastra/core provider-registry.json (installed agent version).
 * Do not hand-edit model lists — re-run:
 *   node apps/agent/scripts/sync-mastra-provider-catalog.mjs
 *
 * Model router format: "provider/model-name"
 */

export type MastraProviderCatalogEntry = {
  id: string;
  name: string;
  /** Env vars Mastra accepts for this provider's API key. */
  apiKeyEnvVars: readonly string[];
  models: readonly string[];
};

export const MASTRA_PROVIDER_CATALOG = ${JSON.stringify(providers, null, 2)} as const satisfies readonly MastraProviderCatalogEntry[];

export type MastraProviderId = (typeof MASTRA_PROVIDER_CATALOG)[number]["id"];

export const MASTRA_PROVIDER_IDS = MASTRA_PROVIDER_CATALOG.map((p) => p.id) as readonly MastraProviderId[];

const byId = new Map(MASTRA_PROVIDER_CATALOG.map((p) => [p.id, p]));

export function getMastraProvider(id: string): MastraProviderCatalogEntry | undefined {
  return byId.get(id as MastraProviderId);
}

export function isMastraProviderId(id: string): id is MastraProviderId {
  return byId.has(id as MastraProviderId);
}

/** Mastra model router id: provider/model */
export function toMastraModelId(providerId: string, modelName: string): string {
  if (modelName.includes("/")) return modelName;
  return \`\${providerId}/\${modelName}\`;
}

export function parseMastraModelId(modelId: string): { provider: string | null; model: string } {
  const idx = modelId.indexOf("/");
  if (idx <= 0) return { provider: null, model: modelId };
  return { provider: modelId.slice(0, idx), model: modelId.slice(idx + 1) };
}
`;

writeFileSync(outPath, body);
console.log(
  `Synced ${providers.length} providers from ${regPath}\n→ ${outPath} (${body.length} bytes)`
);
