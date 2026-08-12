import { createStep } from "@mastra/core/workflows";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { enrichNpm } from "#@/mastra/workflows/detect-stacks-workflow/enrich-npm.step";
import { batchResolveIcons } from "#@/mastra/workflows/organize-stacks-workflow/batch-icon-fetch";

export const resolveIcons = createStep({
  id: "resolve-icons",
  description: "Fetches SVG icons from Iconify using canonical display names",
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

    // One Iconify lookup per unique display name for new non-low-confidence stacks
    const names = [
      ...new Set(
        categorized
          .filter((c) => c.existingStackId === null && c.confidence !== "low")
          .map((c) => c.name)
      )
    ];

    if (names.length === 0) {
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

    // Reuse organize batch helper (concurrency 3)
    const results = await batchResolveIcons(
      names.map((name) => {
        return { stackId: name, stackName: name };
      }),
      3
    );

    const iconByName = new Map(results.map((r) => [r.stackId, r.svg]));
    const resolvedCount = results.filter((r) => !!r.svg).length;

    const categorizedWithIcons = categorized.map((stack) => {
      return {
        ...stack,
        iconSvg: iconByName.get(stack.name) ?? stack.iconSvg,
        health: stack.health ?? null
      };
    });

    log.set({
      event: "detect_stacks_icons_completed",
      missingCount: names.length,
      resolvedCount,
      durationMs: Date.now() - started
    });
    log.emit();

    return { matched, categorized: categorizedWithIcons };
  }
});
