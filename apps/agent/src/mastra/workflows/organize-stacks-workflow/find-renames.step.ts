import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

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
  execute: async ({ inputData, mastra, abortSignal }) => {
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

    const CHUNK_SIZE = 50;
    const renameActions: z.infer<typeof RenameActionSchema>[] = [];
    const usedNewNames = new Set<string>();
    const usedStackIds = new Set<string>();

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
          if (stack.name === rename.newName) continue;
          // Dedup: skip if this stack already has a rename action
          if (usedStackIds.has(rename.stackId)) continue;
          // Dedup: skip if another stack already renames to this name
          if (usedNewNames.has(rename.newName.toLowerCase())) continue;
          usedStackIds.add(rename.stackId);
          usedNewNames.add(rename.newName.toLowerCase());
          renameActions.push({
            stackId: rename.stackId,
            currentName: stack.name,
            newName: rename.newName,
            reason: rename.reason
          });
        }
      } catch (error) {
        console.error("[organize-stacks] Rename analysis failed for chunk:", error);
      }
    }

    return { stacks, mergeActions, renameActions };
  }
});
