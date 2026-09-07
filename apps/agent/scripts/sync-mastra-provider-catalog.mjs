#!/usr/bin/env node
/**
 * Sync packages/core AI provider catalog from the installed @mastra/core registry.
 *
 * Run from repo root or apps/agent:
 *   pnpm mastra:sync-catalog
 *   node apps/agent/scripts/sync-mastra-provider-catalog.mjs
 *
 * Modes:
 *   (default)  regenerate the catalog; skips the write when already in sync
 *   --check    exit 1 when the catalog is stale vs the installed registry
 *              (no write) — CI drift gate
 *
 * Drift detection uses the `Catalog content hash:` comment emitted at the end
 * of the generated file, not byte comparison: the committed file is reflowed
 * by the repo formatter (commit hook), so raw output never matches bytes.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = resolve(__dirname, "..");
const repoRoot = resolve(agentRoot, "../..");
const checkOnly = process.argv.includes("--check");

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

/** sha256 of the provider data (not the file text) — formatter-proof. */
const catalogHash = createHash("sha256")
  .update(JSON.stringify(providers))
  .digest("hex")
  .slice(0, 16);

const body = `/**
 * Generated from @mastra/core provider-registry.json (installed agent version).
 * Do not hand-edit model lists — re-run:
 *   pnpm mastra:sync-catalog
 * CI runs this script with --check and fails when this file is stale.
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

// Catalog content hash: ${catalogHash} — compared by sync script --check; do not edit.
`;

function existingHash(text) {
  const m = text.match(/Catalog content hash: ([0-9a-f]{16})/);
  return m ? m[1] : null;
}

const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
if (existing && existingHash(existing) === catalogHash) {
  console.log(`Mastra provider catalog already in sync (${providers.length} providers).`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `Mastra provider catalog is stale (${providers.length} providers in installed @mastra/core).\n` +
      "Run `pnpm mastra:sync-catalog` and commit the regenerated file."
  );
  process.exit(1);
}

writeFileSync(outPath, body);
console.log(
  `Synced ${providers.length} providers from ${regPath}\n→ ${outPath} (${body.length} bytes)`
);
