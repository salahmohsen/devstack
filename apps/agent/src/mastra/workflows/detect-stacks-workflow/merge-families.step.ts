import { createStep } from "@mastra/core/workflows";
import { type z } from "zod";

import {
  findPackageFamily,
  SCOPE_MERGE_ALLOWLIST,
  type DetectStacksWorkflowInputSchema
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { deduplicateGroups } from "#@/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { type CategorizedEntry } from "#@/mastra/workflows/detect-stacks-workflow/utils";

/**
 * Deterministic family merges (organize find-merges logic applied to in-flight detections).
 * Unifies display names for same-product packages so format groups them into one stack.
 */
export const mergeFamilies = createStep({
  id: "merge-families",
  description: "Merges same-product package families under one display name",
  inputSchema: deduplicateGroups.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_merge_families" });
    const { matched, categorized } = params.inputData;
    if (categorized.length === 0) {
      log.set({
        event: "detect_stacks_merge_families_completed",
        categorizedCount: 0,
        uniqueNamesBefore: 0,
        uniqueNamesAfter: 0,
        durationMs: Date.now() - started
      });
      log.emit();
      return { matched, categorized };
    }

    const namesBefore = new Set(categorized.map((c) => c.name)).size;

    const initData = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    const existingById = new Map(initData.existingStacks.map((s) => [s.id, s.name]));

    // Start from AI names; prefer existing stack names when already linked
    const nameByPkg = new Map<string, string>();
    for (const m of matched) {
      nameByPkg.set(m.npmPackage, m.name);
    }
    for (const c of categorized) {
      if (c.existingStackId && existingById.has(c.existingStackId)) {
        nameByPkg.set(c.npmPackage, existingById.get(c.existingStackId)!);
      } else {
        nameByPkg.set(c.npmPackage, c.name);
      }
    }

    // Family merges: all packages in a known family share the survivor's display name
    const pkgs = [...nameByPkg.keys()];
    const visited = new Set<string>();

    for (const pkg of pkgs) {
      if (visited.has(pkg)) continue;
      const family = findPackageFamily(pkg);
      if (!family) continue;

      // Map actual keys (case may differ)
      const presentKeys = pkgs.filter((p) =>
        family.some((f) => f.toLowerCase() === p.toLowerCase())
      );
      if (presentKeys.length < 2) {
        for (const k of presentKeys) visited.add(k);
        continue;
      }

      // Prefer name from earliest family member that exists, else existing stack name, else first AI name
      let survivorName: string | null = null;
      for (const preferred of family) {
        const key = presentKeys.find((p) => p.toLowerCase() === preferred.toLowerCase());
        if (!key) continue;
        const entry = categorized.find((c) => c.npmPackage === key);
        if (entry?.existingStackId && existingById.has(entry.existingStackId)) {
          survivorName = existingById.get(entry.existingStackId)!;
          break;
        }
        const matchedEntry = matched.find((m) => m.npmPackage === key);
        if (matchedEntry) {
          survivorName = matchedEntry.name;
          break;
        }
      }
      if (!survivorName) {
        for (const preferred of family) {
          const key = presentKeys.find((p) => p.toLowerCase() === preferred.toLowerCase());
          if (key && nameByPkg.has(key)) {
            survivorName = nameByPkg.get(key)!;
            break;
          }
        }
      }
      survivorName ??= nameByPkg.get(presentKeys[0]!) ?? presentKeys[0]!;

      for (const key of presentKeys) {
        nameByPkg.set(key, survivorName);
        visited.add(key);
      }
    }

    // Scope allowlist merges (e.g. all @heroui/*)
    const scopeBuckets = new Map<string, string[]>();
    for (const pkg of pkgs) {
      if (!pkg.startsWith("@")) continue;
      const scope = pkg.split("/")[0];
      if (!scope || !SCOPE_MERGE_ALLOWLIST.has(scope)) continue;
      const list = scopeBuckets.get(scope) ?? [];
      list.push(pkg);
      scopeBuckets.set(scope, list);
    }
    for (const [scope, group] of scopeBuckets) {
      if (group.length < 2) continue;
      // Prefer existing stack name, else shortest display name, else first
      let survivorName: string | null = null;
      for (const key of group) {
        const entry = categorized.find((c) => c.npmPackage === key);
        if (entry?.existingStackId && existingById.has(entry.existingStackId)) {
          survivorName = existingById.get(entry.existingStackId)!;
          break;
        }
        const m = matched.find((x) => x.npmPackage === key);
        if (m) {
          survivorName = m.name;
          break;
        }
      }
      if (!survivorName) {
        const names = group
          .map((k) => nameByPkg.get(k) ?? k)
          .toSorted((a, b) => a.length - b.length);
        survivorName = names[0] ?? scope.slice(1);
      }
      for (const key of group) {
        nameByPkg.set(key, survivorName);
      }
    }

    // Exact-name normalize: case/spacing variants → first seen title form
    const exactGroups = new Map<string, string[]>();
    for (const [pkg, name] of nameByPkg) {
      const key = name.trim().toLowerCase().replace(/\s+/g, " ");
      const list = exactGroups.get(key) ?? [];
      list.push(pkg);
      exactGroups.set(key, list);
    }
    for (const [, group] of exactGroups) {
      if (group.length < 2) continue;
      const names = group.map((p) => nameByPkg.get(p)!);
      // Prefer Title Case / longer proper form
      const survivor = names.toSorted((a, b) => {
        const aTitle = a !== a.toLowerCase() ? 1 : 0;
        const bTitle = b !== b.toLowerCase() ? 1 : 0;
        if (bTitle !== aTitle) return bTitle - aTitle;
        return a.localeCompare(b);
      })[0]!;
      for (const pkg of group) {
        nameByPkg.set(pkg, survivor);
      }
    }

    const nextCategorized: CategorizedEntry[] = categorized.map((c) => {
      return {
        ...c,
        name: nameByPkg.get(c.npmPackage) ?? c.name,
        health: c.health ?? null
      };
    });

    const nextMatched = matched.map((m) => {
      return {
        ...m,
        name: nameByPkg.get(m.npmPackage) ?? m.name
      };
    });

    const namesAfter = new Set(nextCategorized.map((c) => c.name)).size;
    log.set({
      event: "detect_stacks_merge_families_completed",
      categorizedCount: nextCategorized.length,
      uniqueNamesBefore: namesBefore,
      uniqueNamesAfter: namesAfter,
      durationMs: Date.now() - started
    });
    log.emit();

    return { matched: nextMatched, categorized: nextCategorized };
  }
});
