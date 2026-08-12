import { createStep } from "@mastra/core/workflows";

import { fetchNpmPackageMetaBatch } from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { canonicalizeNames } from "#@/mastra/workflows/detect-stacks-workflow/canonicalize-names.step";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { type CategorizedEntry } from "#@/mastra/workflows/detect-stacks-workflow/utils";

/**
 * Prefer the "primary" package for a display-name group when fetching npm description:
 * 1) exact case-insensitive match of display name to package
 * 2) unscoped package
 * 3) first in group
 */
function pickPrimaryPackage(entries: CategorizedEntry[]): string {
  if (entries.length === 0) return "";
  const nameKey = entries[0]!.name.trim().toLowerCase().replace(/\s+/g, "");
  const exact = entries.find((e) => e.npmPackage.toLowerCase().replace(/\s+/g, "") === nameKey);
  if (exact) return exact.npmPackage;
  const unscoped = entries.find((e) => !e.npmPackage.startsWith("@"));
  if (unscoped) return unscoped.npmPackage;
  return entries[0]!.npmPackage;
}

/**
 * Fills description + health from the official npm registry (not LLM copy).
 * One registry lookup per display-name group (primary package).
 */
export const enrichNpm = createStep({
  id: "enrich-npm",
  description: "Fills descriptions and health from the official npm registry",
  inputSchema: canonicalizeNames.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async ({ inputData, abortSignal }) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_enrich_npm" });
    const { matched, categorized } = inputData;

    if (abortSignal?.aborted || categorized.length === 0) {
      log.set({
        event: "detect_stacks_enrich_npm_completed",
        groupCount: 0,
        fetchedCount: 0,
        durationMs: Date.now() - started,
        reason: abortSignal?.aborted ? "aborted" : "empty"
      });
      log.emit();
      return { matched, categorized };
    }

    const newEntries = categorized.filter((c) => !c.existingStackId);
    if (newEntries.length === 0) {
      log.set({
        event: "detect_stacks_enrich_npm_completed",
        groupCount: 0,
        fetchedCount: 0,
        durationMs: Date.now() - started,
        reason: "no_new_stacks"
      });
      log.emit();
      return { matched, categorized };
    }

    const byName = new Map<string, CategorizedEntry[]>();
    for (const e of newEntries) {
      const list = byName.get(e.name) ?? [];
      list.push(e);
      byName.set(e.name, list);
    }

    const primaryByName = new Map<string, string>();
    const packagesToFetch: string[] = [];
    for (const [name, group] of byName) {
      const primary = pickPrimaryPackage(group);
      primaryByName.set(name, primary);
      packagesToFetch.push(primary);
    }

    const metaMap = await fetchNpmPackageMetaBatch(packagesToFetch, {
      signal: abortSignal,
      concurrency: 4,
      includeDownloads: true
    });

    let withDescription = 0;
    const nextCategorized = categorized.map((c) => {
      if (c.existingStackId) return { ...c, health: c.health ?? null };

      const primary = primaryByName.get(c.name) ?? c.npmPackage;
      const meta = metaMap.get(primary);
      if (!meta) return { ...c, health: c.health ?? null };

      if (meta.description) withDescription += 1;
      return {
        ...c,
        description: meta.description ?? c.description,
        health: meta.health ?? c.health ?? null
      };
    });

    log.set({
      event: "detect_stacks_enrich_npm_completed",
      groupCount: byName.size,
      fetchedCount: metaMap.size,
      withDescriptionCount: withDescription,
      durationMs: Date.now() - started
    });
    log.emit(metaMap.size === 0 && byName.size > 0 ? { _forceKeep: true } : undefined);

    return { matched, categorized: nextCategorized };
  }
});
