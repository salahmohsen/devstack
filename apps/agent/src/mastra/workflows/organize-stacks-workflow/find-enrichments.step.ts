import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { batchResolveIcons } from "#@/mastra/workflows/organize-stacks-workflow/batch-icon-fetch";
import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const findEnrichments = createStep({
  id: "find-enrichments",
  description: "Uses LLM to identify stacks missing descriptions, icons, or types",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  execute: async ({ inputData, mastra, abortSignal }) => {
    if (abortSignal?.aborted) {
      return {
        stacks: inputData.stacks,
        mergeActions: inputData.mergeActions,
        renameActions: inputData.renameActions,
        enrichActions: []
      };
    }
    const { stacks, mergeActions, renameActions } = inputData;

    // Only skip merge victims — renamed stacks still need metadata
    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const renameMap = new Map(renameActions.map((r) => [r.stackId, r.newName]));

    const candidates = stacks.filter(
      (s) => !victimIds.has(s.id) && (!s.description || !s.icon || !s.type || s.type === "other")
    );

    if (candidates.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const CHUNK_SIZE = 50;
    const enrichActions: z.infer<typeof EnrichActionSchema>[] = [];

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const stackList = chunk
        .map((s) => {
          const displayName = renameMap.get(s.id) ?? s.name;
          return `- id: ${s.id} | "${displayName}" | type: ${s.type ?? "none"} | desc: ${s.description ?? "none"} | icon: ${s.icon ? "present" : "none"}`;
        })
        .join("\n");

      const prompt = `Suggest enrichments for stacks with missing metadata.

Stacks:
${stackList}

For each stack, suggest:
1. description: one-sentence description (if missing)
2. icon: a short Iconify search query for the brand logo, e.g. "react", "tailwind css", "framer", "prisma" (if missing). Prefer the product brand name, not the stack type.
3. type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | state management | other (if missing or "other")

TYPE GUIDELINES:
- Framework: React, Vue, Angular, Next.js, Nuxt, Remix, Astro, Svelte, Hono, Express
- UI: Tailwind CSS, Radix UI, shadcn/ui, HeroUI, Base UI, Chakra UI, Material UI, Framer Motion
- Database: Prisma, Drizzle, Mongoose, TypeORM, Sequelize
- Tooling: Vite, Webpack, ESLint, Prettier, TypeScript
- Testing: Vitest, Jest, Playwright, Cypress
- AI: OpenAI, Anthropic, LangChain, AI SDK, Mastra
- Auth: Better Auth, NextAuth, Lucia
- Deployment: Vercel, Netlify, Cloudflare Workers, Firebase
- State management: Zustand, Jotai, Redux, Recoil

Output JSON:
{
  "enrichments": [
    {
      "stackId": "id",
      "stackName": "name",
      "description": "new description or null",
      "icon": "search query or null",
      "type": "correct type or null"
    }
  ]
}

Only suggest changes when metadata is clearly missing or wrong. Skip stacks with complete metadata.
Do not invent icons for stacks that already have one.`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: z.object({
                enrichments: z.array(EnrichActionSchema).default([])
              })
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout after 60s")), 60_000)
          )
        ]);

        const iconCandidates: Array<{
          stackId: string;
          stackName: string;
          idx: number;
        }> = [];
        const pendingEnriches: Array<{
          enrich: z.infer<typeof EnrichActionSchema>;
          stack: (typeof chunk)[number];
        }> = [];

        for (const enrich of result.object.enrichments ?? []) {
          const stack = chunk.find((s) => s.id === enrich.stackId);
          if (!stack) continue;

          const descChanged = Boolean(
            enrich.description && enrich.description !== stack.description
          );
          // Only request icon when stack has none — never replace existing SVG via search query
          const needsIcon = !stack.icon && Boolean(enrich.icon);
          const typeChanged = Boolean(
            enrich.type && enrich.type !== stack.type && enrich.type !== "other"
          );

          if (descChanged || needsIcon || typeChanged) {
            const idx = pendingEnriches.length;
            pendingEnriches.push({ enrich, stack });
            if (needsIcon && enrich.icon) {
              // Prefer brand query from LLM; fall back to (renamed) display name
              const displayName = renameMap.get(stack.id) ?? stack.name;
              iconCandidates.push({
                stackId: enrich.stackId,
                stackName: enrich.icon.trim() || displayName,
                idx
              });
            }
          }
        }

        const iconResults =
          iconCandidates.length > 0 ? await batchResolveIcons(iconCandidates, 3) : [];
        const iconMap = new Map(iconResults.map((r) => [r.stackId, r.svg]));

        for (const { enrich, stack } of pendingEnriches) {
          const description =
            enrich.description && enrich.description !== stack.description
              ? enrich.description
              : null;
          const icon = !stack.icon ? (iconMap.get(enrich.stackId) ?? null) : null;
          const type =
            enrich.type && enrich.type !== stack.type && enrich.type !== "other"
              ? enrich.type
              : null;

          if (!description && !icon && !type) continue;

          enrichActions.push({
            stackId: enrich.stackId,
            stackName: renameMap.get(stack.id) ?? stack.name,
            description,
            icon,
            type
          });
        }
      } catch (error) {
        console.error("[organize-stacks] Enrichment analysis failed for chunk:", error);
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions };
  }
});
