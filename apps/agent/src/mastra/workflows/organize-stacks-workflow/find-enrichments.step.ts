import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { type OrganizeStacksInput } from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";
import { buildOrganizeChunkLabel, writeOrganizeProgress } from "#@/mastra/lib/workflow-progress";
import { batchResolveIcons } from "#@/mastra/workflows/organize-stacks-workflow/batch-icon-fetch";
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

/**
 * Enrich chunk tuning (Task 3):
 * - 40 stacks/chunk (was 50) — enrich schema is wider (desc/icon/type).
 * - 45s timeout + sequential loop; soft-fail continues remaining chunks.
 */
const ENRICH_CHUNK_SIZE = 40;
const ENRICH_CHUNK_TIMEOUT_MS = 45_000;

export const findEnrichments = createStep({
  id: "find-enrichments",
  description: "Uses LLM to identify stacks missing descriptions, icons, or types",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    notes: z.array(z.string()).default([])
  }),
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__organize_stacks_enrich" });
    const { inputData, mastra, abortSignal, writer } = params;
    if (abortSignal?.aborted) {
      log.set({
        event: "organize_stacks_enrich_completed",
        enrichCount: 0,
        durationMs: Date.now() - started,
        reason: "aborted"
      });
      log.emit({ _forceKeep: true });
      return {
        stacks: inputData.stacks,
        mergeActions: inputData.mergeActions,
        renameActions: inputData.renameActions,
        enrichActions: [],
        notes: inputData.notes ?? []
      };
    }
    const { stacks, mergeActions, renameActions } = inputData;
    const priorNotes = inputData.notes ?? [];

    // Only skip merge victims — renamed stacks still need metadata
    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const renameMap = new Map(renameActions.map((r) => [r.stackId, r.newName]));

    const candidates = stacks.filter(
      (s) => !victimIds.has(s.id) && (!s.description || !s.icon || !s.type || s.type === "other")
    );

    if (candidates.length === 0) {
      log.set({
        event: "organize_stacks_enrich_completed",
        enrichCount: 0,
        durationMs: Date.now() - started,
        reason: "no_candidates"
      });
      log.emit();
      return { stacks, mergeActions, renameActions, enrichActions: [], notes: priorNotes };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      log.set({
        event: "organize_stacks_enrich_completed",
        enrichCount: 0,
        durationMs: Date.now() - started,
        reason: "missing_agent",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions: [],
        notes: [...priorNotes, organizeMissingAgentNote("enrich")]
      };
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    // Missing BYO: skip enrichments (merge/rename heuristics still apply).
    if (!model) {
      log.set({
        event: "organize_stacks_enrich_completed",
        enrichCount: 0,
        durationMs: Date.now() - started,
        reason: "missing_byo",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions: [],
        notes: [...priorNotes, organizeMissingByoNote("enrich")]
      };
    }

    const enrichActions: z.infer<typeof EnrichActionSchema>[] = [];
    const notes = [...priorNotes];
    const chunkTotal = Math.ceil(candidates.length / ENRICH_CHUNK_SIZE);
    let chunksFailed = 0;

    for (let i = 0; i < candidates.length; i += ENRICH_CHUNK_SIZE) {
      if (abortSignal?.aborted) break;
      const chunkIndex = Math.floor(i / ENRICH_CHUNK_SIZE);
      const chunk = candidates.slice(i, i + ENRICH_CHUNK_SIZE);
      const label = buildOrganizeChunkLabel("enrich", chunkIndex + 1, chunkTotal);

      log.set({
        candidateCount: candidates.length,
        chunkIndex,
        chunkTotal,
        chunkSize: chunk.length,
        progressLabel: label,
        durationMs: Date.now() - started
      });
      await writeOrganizeProgress(writer, {
        chunkIndex,
        chunkTotal,
        itemTotal: candidates.length,
        phase: "enrich",
        label
      });

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

      const chunkStarted = Date.now();
      try {
        const result = await withTimeoutSignal(
          (signal) =>
            agent.generate([{ role: "user", content: prompt }], {
              structuredOutput: {
                schema: z.object({
                  enrichments: z.array(EnrichActionSchema).default([])
                })
              },
              model,
              abortSignal: signal
            }),
          ENRICH_CHUNK_TIMEOUT_MS,
          `LLM timeout after ${ENRICH_CHUNK_TIMEOUT_MS / 1000}s`,
          abortSignal
        );

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
        if (abortSignal?.aborted) break;
        chunksFailed += 1;
        // Separate short logger so chunk failures stay searchable without sealing the parent event.
        const chunkLog = createLogger({ operation: "agent__organize_stacks_enrich_chunk" });
        chunkLog.error(error instanceof Error ? error : new Error(String(error)), {
          event: "organize_stacks_enrich_chunk_failed",
          chunkIndex,
          chunkTotal,
          chunkStart: i,
          chunkSize: chunk.length,
          durationMs: Date.now() - chunkStarted
        });
        chunkLog.emit({ _forceKeep: true });
        if (!notes.some((n) => n.startsWith("AI enrichments failed"))) {
          notes.push(organizeLlmFailedNote("enrich", error));
        }
      }
    }

    const softFailed = notes.length > priorNotes.length || chunksFailed > 0;
    log.set({
      event: "organize_stacks_enrich_completed",
      enrichCount: enrichActions.length,
      candidateCount: candidates.length,
      chunkCount: chunkTotal,
      chunkFailures: chunksFailed,
      durationMs: Date.now() - started,
      softFailed
    });
    log.emit(softFailed ? { _forceKeep: true } : undefined);

    return { stacks, mergeActions, renameActions, enrichActions, notes };
  }
});
