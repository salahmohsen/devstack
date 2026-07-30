import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { type OrganizeStacksInput } from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import {
  organizeLlmFailedNote,
  organizeMissingAgentNote,
  organizeMissingByoNote
} from "#@/mastra/workflows/organize-stacks-workflow/organize-note";
import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const sortStacks = createStep({
  id: "sort-stacks",
  description: "Uses LLM to sort stacks by importance and foundational role",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string()),
    notes: z.array(z.string()).default([])
  }),
  execute: async (params) => {
    const { inputData, mastra, abortSignal } = params;
    const priorNotes = inputData.notes ?? [];
    if (abortSignal?.aborted) {
      // Do not invent a fake reorder when aborted — leave order unchanged.
      return { ...inputData, sortOrder: [], notes: priorNotes };
    }
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;

    // Skip merge victims — they'll be deleted
    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const remaining = stacks.filter((s) => !victimIds.has(s.id));

    if (remaining.length === 0) {
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: [],
        notes: priorNotes
      };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        // Empty = no reorder suggestion (not "identity order as success")
        sortOrder: [],
        notes: [...priorNotes, organizeMissingAgentNote("sort")]
      };
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    if (!model) {
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: [],
        notes: [...priorNotes, organizeMissingByoNote("sort")]
      };
    }

    const stackList = remaining
      .map((s) => `- id: ${s.id} | "${s.name}" | type: ${s.type} | projects: ${s.projectCount}`)
      .join("\n");

    const prompt = `Sort these tech stacks by importance and foundational role. Most foundational/important first.

Stacks:
${stackList}

SORTING RULES:
- Languages first: TypeScript, JavaScript, Python, Go, Rust, etc.
- Core frameworks next: React, Vue, Angular, Next.js, Nuxt, Svelte, etc.
- Build tools: Vite, Webpack, esbuild, etc.
- CSS/Styling: Tailwind CSS, Styled Components, etc.
- State management: Zustand, Jotai, Redux, etc.
- Data fetching: TanStack Query, SWR, etc.
- Databases/ORMs: Prisma, Drizzle, PostgreSQL, etc.
- Auth: Better Auth, NextAuth, etc.
- Testing: Vitest, Jest, Playwright, etc.
- Deployment: Vercel, Cloudflare, Docker, etc.
- Dev tools: ESLint, Prettier, TypeScript, etc.
- UI component libraries: Radix UI, HeroUI, etc.
- Utilities last: clsx, zod, lodash, etc.

Within each category, sort by project count (more projects = more important).

Output JSON:
{
  "orderedIds": ["id1", "id2", ...]
}

Return ALL remaining stack IDs in order.`;

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: {
            schema: z.object({
              orderedIds: z.array(z.string())
            })
          },
          model
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
        )
      ]);

      // Validate: all IDs must exist in remaining stacks
      const remainingIds = new Set(remaining.map((s) => s.id));
      const validOrder = (result.object.orderedIds ?? []).filter((id) => remainingIds.has(id));

      // Append any stacks the LLM missed
      for (const s of remaining) {
        if (!validOrder.includes(s.id)) validOrder.push(s.id);
      }

      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: validOrder,
        notes: priorNotes
      };
    } catch (error) {
      const log = createLogger({ operation: "agent__organize_stacks_sort" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "organize_stacks_sort_failed"
      });
      log.emit({ _forceKeep: true });
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        // Leave order unchanged — do not surface identity order as a "reorder"
        sortOrder: [],
        notes: [...priorNotes, organizeLlmFailedNote("sort", error)]
      };
    }
  }
});
