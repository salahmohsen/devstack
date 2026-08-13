import { createStep } from "@mastra/core/workflows";

import {
  getPackageFamilyDisplayName,
  getPackageFamilyPrimary,
  resolveIconForCandidates
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { enrichNpm } from "#@/mastra/workflows/detect-stacks-workflow/enrich-npm.step";

export const resolveIcons = createStep({
  id: "resolve-icons",
  description: "Fetches SVG icons from Iconify using display name + npm package candidates",
  inputSchema: enrichNpm.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async ({ inputData, abortSignal }) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_icons" });
    const { matched, categorized } = inputData;

    if (abortSignal?.aborted) {
      log.set({
        event: "detect_stacks_icons_completed",
        missingCount: 0,
        resolvedCount: 0,
        durationMs: Date.now() - started,
        reason: "aborted"
      });
      log.emit();
      return { matched, categorized };
    }

    // Iconify for every new stack still missing an icon (including low confidence).
    // Key by display name so siblings that share a name after family merge share one fetch.
    const missing = categorized.filter((c) => c.existingStackId === null && !c.iconSvg);
    const byDisplayName = new Map<string, (typeof missing)[number]>();
    for (const entry of missing) {
      if (!byDisplayName.has(entry.name)) byDisplayName.set(entry.name, entry);
    }

    if (byDisplayName.size === 0) {
      log.set({
        event: "detect_stacks_icons_completed",
        missingCount: 0,
        resolvedCount: 0,
        durationMs: Date.now() - started,
        reason: "no_candidates"
      });
      log.emit();
      return { matched, categorized };
    }

    const iconByName = new Map<string, string | null>();
    const entries = [...byDisplayName.entries()];
    const concurrency = 3;
    for (let i = 0; i < entries.length; i += concurrency) {
      if (abortSignal?.aborted) break;
      const batch = entries.slice(i, i + concurrency);
      const settled = await Promise.all(
        batch.map(async ([displayName, sample]) => {
          const primary = getPackageFamilyPrimary(sample.npmPackage);
          const curated = getPackageFamilyDisplayName(sample.npmPackage);
          const svg = await resolveIconForCandidates(
            [displayName, curated, primary, sample.npmPackage].filter(
              (v): v is string => typeof v === "string" && v.length > 0
            )
          );
          return [displayName, svg] as const;
        })
      );
      for (const [name, svg] of settled) {
        iconByName.set(name, svg);
      }
    }

    const resolvedCount = [...iconByName.values()].filter((v) => !!v).length;

    const categorizedWithIcons = categorized.map((stack) => {
      return {
        ...stack,
        iconSvg: iconByName.get(stack.name) ?? stack.iconSvg,
        health: stack.health ?? null
      };
    });

    log.set({
      event: "detect_stacks_icons_completed",
      missingCount: byDisplayName.size,
      resolvedCount,
      durationMs: Date.now() - started
    });
    log.emit();

    return { matched, categorized: categorizedWithIcons };
  }
});
