#!/usr/bin/env node
/**
 * Sync packages/core AI provider catalog from the installed @mastra/core registry
 * plus models.dev per-model capability data (tool_call / structured_output).
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
 * of the generated file, not byte comparison: the hash covers data only, so
 * reflowing the file (the script formats its own output via vp fmt after
 * writing) never trips a false drift.
 *
 * models.dev is the source of truth for capabilities. When it is unreachable
 * the script fails (exit 1) and keeps the last committed catalog — CI goes
 * red; dev.sh warns and continues with the stale-but-consistent file.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = resolve(__dirname, "..");
const repoRoot = resolve(agentRoot, "../..");
const checkOnly = process.argv.includes("--check");

const MODELS_DEV_URL = "https://models.dev/api.json";
const MODELS_DEV_TIMEOUT_MS = 20_000;

async function fetchModelsDev() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODELS_DEV_TIMEOUT_MS);
  try {
    const response = await fetch(MODELS_DEV_URL, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object") {
      throw new Error("unexpected payload shape");
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

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

/** Strict flag read: only real booleans count; anything else is unknown (null). */
function flagOr(value) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

const regPath = findRegistry();

/**
 * Mastra's gateway auto-refresh (MASTRA_AUTO_REFRESH_PROVIDERS, default on in
 * dev) rewrites dist/provider-registry.json in place at runtime, so a dev
 * machine's registry drifts from the shipped tarball that a clean install —
 * CI and prod — sees. A catalog generated from the drifted file references
 * providers clean installs lack. Detect it by mtime: the registry should be
 * as old as the package install; anything materially newer was rewritten.
 */
function assertRegistryNotDrifted() {
  const registryStat = statSync(regPath);
  const packageStat = statSync(join(dirname(regPath), "..", "package.json"));
  if (registryStat.mtimeMs - packageStat.mtimeMs <= 60_000) return;
  const message =
    `provider registry was rewritten after install (registry ${registryStat.mtime.toISOString()} ` +
    `> package ${packageStat.mtime.toISOString()}).\n` +
    "The live gateway sync drifts node_modules from the shipped registry; a catalog " +
    "generated now will fail CI's clean-install check.\n" +
    "Fix: keep MASTRA_AUTO_REFRESH_PROVIDERS=false (packages/env/.env), reinstall " +
    "@mastra/core (or restore dist/provider-registry.json from the version tarball), then re-run.";
  if (checkOnly) {
    console.error(`Mastra provider registry drift detected: ${message}`);
    process.exit(1);
  }
  console.warn(`WARNING: Mastra ${message}`);
}

assertRegistryNotDrifted();
const reg = JSON.parse(readFileSync(regPath, "utf8"));
const modelsDev = await fetchModelsDev();

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

/** `provider/model` → capability flags joined from models.dev. Unknown → null. */
const capabilities = {};
let covered = 0;
let total = 0;
for (const provider of providers) {
  const devEntry = modelsDev[provider.id];
  const devModels = devEntry && typeof devEntry === "object" ? devEntry.models : undefined;
  for (const model of provider.models) {
    total += 1;
    const devModel =
      devModels && typeof devModels === "object" && typeof devModels[model] === "object"
        ? devModels[model]
        : undefined;
    if (devModel) covered += 1;
    capabilities[`${provider.id}/${model}`] = {
      toolCall: flagOr(devModel?.tool_call),
      structuredOutput: flagOr(devModel?.structured_output)
    };
  }
}

const outPath = join(repoRoot, "packages/core/src/ai-settings/mastra-provider-catalog.ts");

/** sha256 of the data (not the file text) — formatter-proof. */
const catalogHash = createHash("sha256")
  .update(JSON.stringify({ providers, capabilities }))
  .digest("hex")
  .slice(0, 16);

/**
 * Registry-only hash — what --check gates on. models.dev capability data is
 * fetched live and drifts day to day; gating on it would fail CI on churn
 * unrelated to the dependency. Provider/model lists come from the installed
 * @mastra/core and only change on a dependency bump, which is exactly what
 * the gate must catch.
 */
const registryHash = createHash("sha256")
  .update(JSON.stringify({ providers }))
  .digest("hex")
  .slice(0, 16);

const body = `/**
 * Generated from @mastra/core provider-registry.json (installed agent version)
 * plus models.dev per-model capability data.
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

/** Capability flags for a model. null = unknown (not in models.dev, custom, free-typed). */
export type MastraModelCapability = {
  toolCall: boolean | null;
  structuredOutput: boolean | null;
};

export const MASTRA_MODEL_CAPABILITIES = ${JSON.stringify(capabilities, null, 2)} as const satisfies Record<string, MastraModelCapability>;

const UNKNOWN_MODEL_CAPABILITY: MastraModelCapability = {
  toolCall: null,
  structuredOutput: null
};

export function modelCapabilityFor(modelId: string): MastraModelCapability {
  const map = MASTRA_MODEL_CAPABILITIES as Record<string, MastraModelCapability>;
  return map[modelId] ?? UNKNOWN_MODEL_CAPABILITY;
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

// Catalog content hash: ${catalogHash} — informational (includes live models.dev capabilities).
// Catalog registry hash: ${registryHash} — compared by sync script --check; do not edit.
`;

function existingHash(text) {
  const m = text.match(/Catalog registry hash: ([0-9a-f]{16})/);
  return m ? m[1] : null;
}

/**
 * The generated body embeds raw JSON.stringify output (quoted keys, exploded
 * arrays). Reflow it to repo style right after writing so the worktree file
 * matches the committed file without relying on the commit hook — the dev.sh
 * self-heal path never runs a formatter.
 */
function formatGeneratedFile(path) {
  const res = spawnSync("pnpm", ["exec", "vp", "fmt", "--write", path], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  if (res.status !== 0) {
    console.warn(
      "vp fmt unavailable — catalog written unformatted; run `vp fmt` before committing."
    );
  }
}

const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
if (existing && existingHash(existing) === registryHash) {
  console.log(
    `Mastra provider catalog already in sync (${providers.length} providers, ${total} models).`
  );
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `Mastra provider catalog is stale (${providers.length} providers / ${total} models in installed @mastra/core).\n` +
      "Run `pnpm mastra:sync-catalog` and commit the regenerated file."
  );
  process.exit(1);
}

writeFileSync(outPath, body);
formatGeneratedFile(outPath);
console.log(
  `Synced ${providers.length} providers / ${total} models (capabilities: ${covered}/${total} from models.dev) from ${regPath}\n→ ${outPath} (${body.length} bytes)`
);
