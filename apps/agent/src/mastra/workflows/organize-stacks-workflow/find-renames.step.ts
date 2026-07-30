import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { normalizeOrganizeName, type OrganizeStacksInput } from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

import { generateModelOption } from "#@/mastra/byo-model";
import {
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const findRenames = createStep({
  id: "find-renames",
  description: "Uses LLM to identify stacks needing name standardization",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema)
  }),
  execute: async (params) => {
    const { inputData, mastra, abortSignal } = params;
    if (abortSignal?.aborted) {
      return { stacks: inputData.stacks, mergeActions: inputData.mergeActions, renameActions: [] };
    }
    const { stacks, mergeActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const candidates = stacks.filter((s) => !victimIds.has(s.id));

    if (candidates.length === 0) {
      return { stacks, mergeActions, renameActions: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return { stacks, mergeActions, renameActions: [] };
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    if (!model) {
      return { stacks, mergeActions, renameActions: [] };
    }

    const CHUNK_SIZE = 50;
    const renameActions: z.infer<typeof RenameActionSchema>[] = [];
    const extraMerges: z.infer<typeof MergeActionSchema>[] = [];
    const usedStackIds = new Set<string>();
    // Normalized name → owner after planned renames/merges
    const nameOwner = new Map<string, { id: string; name: string }>();
    for (const s of candidates) {
      nameOwner.set(normalizeOrganizeName(s.name), { id: s.id, name: s.name });
    }

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const stackList = chunk.map((s) => `- id: ${s.id} | name: "${s.name}"`).join("\n");

      const prompt = `Identify stacks with inconsistent or non-canonical names.

Stacks:
${stackList}

CANONICAL NAMES (use these exact spellings):
React, Vue, Angular, Svelte, Next.js, Nuxt, Remix, Astro, Solid, Preact
Tailwind CSS, Styled Components, Emotion, Framer Motion
Prisma, Drizzle, Mongoose, TypeORM, Sequelize, Knex
Vite, Webpack, esbuild, Rollup, Turbopack
TanStack Query, TanStack Router, TanStack Table
Better Auth, NextAuth, Lucia
Vitest, Jest, Playwright, Cypress

RENAME RULES:
- Title case: "reactjs" → "React", "tailwindcss" → "Tailwind CSS"
- Proper spacing: "framer motion" → "Framer Motion"
- Official names: "drizzle-orm" → "Drizzle", "prisma client" → "Prisma"
- Keep existing canonical names unchanged
- NEVER rename a stack to a name that another stack in the list already has — those are merges, not renames
- Do not suggest a rename when the current name is already correct (same spelling/casing)

Output JSON:
{
  "renames": [
    {
      "stackId": "id",
      "currentName": "current",
      "newName": "canonical",
      "reason": "why rename"
    }
  ]
}

Only suggest renames when the current name is clearly non-canonical. Skip stacks that already have correct names.`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            model,
            structuredOutput: {
              schema: z.object({
                renames: z.array(RenameActionSchema).default([])
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
          )
        ]);

        for (const rename of result.object.renames ?? []) {
          const stack = chunk.find((s) => s.id === rename.stackId);
          if (!stack) continue;
          if (usedStackIds.has(rename.stackId)) continue;
          if (victimIds.has(rename.stackId)) continue;

          const newName = rename.newName?.trim();
          if (!newName) continue;

          // No-op (case/spacing insensitive)
          if (normalizeOrganizeName(stack.name) === normalizeOrganizeName(newName)) continue;

          const key = normalizeOrganizeName(newName);
          const owner = nameOwner.get(key);

          // Name already owned by another living stack → auto-merge
          if (owner && owner.id !== rename.stackId) {
            usedStackIds.add(rename.stackId);
            victimIds.add(rename.stackId);
            extraMerges.push({
              victimId: rename.stackId,
              victimName: stack.name,
              survivorId: owner.id,
              survivorName: owner.name,
              reason: `Auto-merged: both resolve to "${owner.name}" (${rename.reason})`
            });
            // Free victim's old name key if still pointing at them
            const oldKey = normalizeOrganizeName(stack.name);
            if (nameOwner.get(oldKey)?.id === rename.stackId) {
              nameOwner.delete(oldKey);
            }
            continue;
          }

          usedStackIds.add(rename.stackId);
          const oldKey = normalizeOrganizeName(stack.name);
          if (nameOwner.get(oldKey)?.id === rename.stackId) {
            nameOwner.delete(oldKey);
          }
          nameOwner.set(key, { id: rename.stackId, name: newName });
          renameActions.push({
            stackId: rename.stackId,
            currentName: stack.name,
            newName,
            reason: rename.reason
          });
        }
      } catch (error) {
        const log = createLogger({ operation: "agent__organize_stacks_rename" });
        log.error(error instanceof Error ? error : new Error(String(error)), {
          event: "organize_stacks_rename_chunk_failed"
        });
        log.emit({ _forceKeep: true });
      }
    }

    return {
      stacks,
      mergeActions: [...mergeActions, ...extraMerges],
      renameActions
    };
  }
});
