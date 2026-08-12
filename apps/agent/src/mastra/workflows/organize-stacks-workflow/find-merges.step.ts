import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  OrganizeStacksInputSchema,
  SAME_PROJECT_PACKAGE_FAMILIES,
  SCOPE_MERGE_ALLOWLIST
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import {
  MergeActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const findMerges = createStep({
  id: "find-merges",
  description: "Deterministically finds stacks to merge by npm scope and known package families",
  inputSchema: OrganizeStacksInputSchema,
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  execute: async ({ inputData }) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__organize_stacks_merges" });
    const { stacks } = inputData;

    if (stacks.length === 0) {
      log.set({
        event: "organize_stacks_merges_completed",
        stackCount: 0,
        mergeCount: 0,
        durationMs: Date.now() - started
      });
      log.emit();
      return { stacks, mergeActions: [] };
    }

    // Group stacks by npm scope (e.g., all @heroui/* together)
    const scopeGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number }>
    >();
    const familyGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number; pkg: string }>
    >();

    // Case/spacing-insensitive exact-name duplicates (e.g. "React" + "react")
    const exactNameGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number }>
    >();

    for (const stack of stacks) {
      const nameKey = stack.name.trim().toLowerCase().replace(/\s+/g, " ");
      if (!exactNameGroups.has(nameKey)) exactNameGroups.set(nameKey, []);
      exactNameGroups.get(nameKey)!.push({
        id: stack.id,
        name: stack.name,
        projectCount: stack.projectCount
      });

      // Mono-product scopes only — never blanket-merge @tanstack/*, @types/*, @radix-ui/*
      const pkg = stack.name.toLowerCase().replace(/\s+/g, "");
      if (pkg.startsWith("@")) {
        const scope = pkg.split("/")[0];
        if (scope && SCOPE_MERGE_ALLOWLIST.has(scope)) {
          if (!scopeGroups.has(scope)) scopeGroups.set(scope, []);
          scopeGroups.get(scope)!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount
          });
        }
      }

      // Group by known family
      for (const family of SAME_PROJECT_PACKAGE_FAMILIES) {
        if (
          family.some(
            (f) => f.toLowerCase() === pkg || f.toLowerCase() === stack.name.toLowerCase()
          )
        ) {
          if (!familyGroups.has(family.join(","))) {
            familyGroups.set(family.join(","), []);
          }
          familyGroups.get(family.join(","))!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount,
            pkg
          });
          break;
        }
      }
    }

    // Build merge actions: for each group with 2+ members, keep the one with most projects as survivor
    const mergeActions: z.infer<typeof MergeActionSchema>[] = [];
    const usedAsVictim = new Set<string>();

    function addMerges(
      group: Array<{ id: string; name: string; projectCount: number }>,
      reason: string
    ) {
      if (group.length < 2) return;

      // Sort by projectCount desc, then alphabetically
      const sorted = [...group].toSorted(
        (
          a: { id: string; name: string; projectCount: number },
          b: { id: string; name: string; projectCount: number }
        ) => {
          const diff = b.projectCount - a.projectCount;
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
      );

      const survivor = sorted[0];
      if (!survivor) return;

      for (let i = 1; i < sorted.length; i++) {
        const victim = sorted[i];
        if (!victim) continue;
        // Each stack can only be victim ONCE (no chains), but SAME survivor can have multiple
        if (usedAsVictim.has(victim.id)) continue;
        if (victim.id === survivor.id) continue;
        usedAsVictim.add(victim.id);
        mergeActions.push({
          victimId: victim.id,
          victimName: victim.name,
          survivorId: survivor.id,
          survivorName: survivor.name,
          reason
        });
      }
    }

    // Exact-name duplicates first (highest confidence)
    for (const [, group] of exactNameGroups) {
      if (group.length < 2) continue;
      addMerges(group, `Duplicate name: "${group[0]?.name}"`);
    }

    for (const [scope, group] of scopeGroups) {
      addMerges(group, `All ${scope}/* packages are the same library`);
    }

    for (const [family, group] of familyGroups) {
      addMerges(group, `Same project: ${family}`);
    }

    log.set({
      event: "organize_stacks_merges_completed",
      stackCount: stacks.length,
      mergeCount: mergeActions.length,
      durationMs: Date.now() - started
    });
    log.emit();
    return { stacks, mergeActions };
  }
});
