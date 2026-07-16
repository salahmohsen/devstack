import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { resolveIconForPackage } from "@tsu-stack/core";

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

    const skipIds = new Set([
      ...mergeActions.map((m) => m.victimId),
      ...renameActions.map((r) => r.stackId)
    ]);

    const candidates = stacks.filter(
      (s) => !skipIds.has(s.id) && (!s.description || !s.icon || !s.type || s.type === "other")
    );

    if (candidates.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return { stacks, mergeActions, renameActions, enrichActions: [] };
    }

    const CHUNK_SIZE = 20;
    const enrichActions: z.infer<typeof EnrichActionSchema>[] = [];

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);
      const stackList = chunk
        .map(
          (s) =>
            `- id: ${s.id} | "${s.name}" | type: ${s.type ?? "none"} | desc: ${s.description ?? "none"} | icon: ${s.icon ?? "none"}`
        )
        .join("\n");

      const prompt = `Suggest enrichments for stacks with missing metadata.

Stacks:
${stackList}

For each stack, suggest:
1. description: one-sentence description (if missing)
2. icon: a short search query to find an Iconify icon, e.g. "react", "tailwind css", "prisma" (if missing)
3. type: framework | language | database | ui | auth | deployment | testing | ai | tooling | storage | other (if missing or "other")

TYPE GUIDELINES:
- Framework: React, Vue, Angular, Next.js, Nuxt, Remix, Astro, Svelte, Hono, Express
- UI: Tailwind CSS, Radix UI, shadcn/ui, HeroUI, Base UI, Chakra UI, Material UI
- Database: Prisma, Drizzle, Mongoose, TypeORM, Sequelize
- Tooling: Vite, Webpack, ESLint, Prettier, TypeScript
- Testing: Vitest, Jest, Playwright, Cypress
- AI: OpenAI, Anthropic, LangChain, AI SDK, Mastra
- Auth: Better Auth, NextAuth, Lucia
- Deployment: Vercel, Netlify, Cloudflare Workers, Firebase

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

Only suggest changes when metadata is clearly missing or wrong. Skip stacks with complete metadata.`;

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

        for (const enrich of result.object.enrichments ?? []) {
          const stack = chunk.find((s) => s.id === enrich.stackId);
          if (!stack) continue;

          const descChanged = enrich.description && enrich.description !== stack.description;
          const iconChanged = enrich.icon && enrich.icon !== stack.icon;
          const typeChanged = enrich.type && enrich.type !== stack.type && enrich.type !== "other";

          if (descChanged || iconChanged || typeChanged) {
            let iconSvg: string | null = null;
            if (iconChanged && enrich.icon) {
              iconSvg = await resolveIconForPackage(enrich.icon);
            }
            enrichActions.push({
              stackId: enrich.stackId,
              stackName: stack.name,
              description: descChanged ? enrich.description : null,
              icon: iconSvg,
              type: typeChanged ? enrich.type : null
            });
          }
        }
      } catch (error) {
        console.error("[organize-stacks] Enrichment analysis failed for chunk:", error);
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions };
  }
});
