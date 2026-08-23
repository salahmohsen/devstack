import { createStep } from "@mastra/core/workflows";

import {
  APPLY_PACKAGE_REWRITE_CHUNK_SIZE,
  ApplyPackageExperienceRewriteChunkSchema,
  chunkArray,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

import { createAgentLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import {
  applyPackageRequestContext,
  raceGenerate,
  REWRITE_CHUNK_TIMEOUT_MS,
  REWRITE_MAX_OUTPUT_TOKENS
} from "#@/mastra/workflows/apply-package-workflow/llm-shared";
import {
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageJobBrief,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

type ExperienceItem = ApplyPackageWorkflowState["portfolio"]["experiences"][number];
type ExperienceRewrite = ApplyPackageWorkflowState["experienceRewrites"][number];

function buildExperienceChunkPrompt(
  jobBrief: ApplyPackageJobBrief,
  chunk: ExperienceItem[],
  chunkIndex: number,
  chunkCount: number
): string {
  const items = chunk.map((e) => {
    return {
      experienceId: e.id,
      title: e.title,
      organization: e.organization,
      description: e.description.slice(0, 1_200),
      fromDate: e.fromDate ?? null,
      toDate: e.toDate ?? null,
      isPresent: e.isPresent ?? false
    };
  });

  return `Rewrite portfolio experiences for this job application (chunk ${chunkIndex}/${chunkCount}).

Activate the **application-apply-package** skill first, then rewrite.

Job brief (JSON):
${JSON.stringify(
  {
    title: jobBrief.title,
    companyName: jobBrief.companyName,
    descriptionUsed: jobBrief.descriptionUsed,
    location: jobBrief.location ?? null,
    salaryRange: jobBrief.salaryRange ?? null,
    notes: jobBrief.notes ?? null
  },
  null,
  2
)}

Experiences to rewrite (JSON). Use each experienceId exactly as given:
${JSON.stringify(items, null, 2)}

Rules:
- Return one item per experienceId above (no extras, no omissions).
- rewrittenBullets: 2–5 impact-oriented bullets grounded only in the item description (+ job fit).
- Do not rename company/organization or title.
- Do not invent employers, metrics, tools, or achievements not in the source text.
- Prose: no em dashes, en dashes, or spaced "--" asides. Use commas or periods. Avoid leverage/synergy/utilize/spearheaded/results-driven unless already in the source.
- Return a single JSON object shaped as { "items": [ { "experienceId", "rewrittenBullets" }, ... ] }.
- Never return a bare top-level array; always wrap rewrites under "items".`;
}

function assertChunkCoverage(
  stepLabel: string,
  chunkIds: Set<string>,
  items: Array<{ experienceId: string }>
): void {
  for (const item of items) {
    if (!chunkIds.has(item.experienceId)) {
      throw new Error(`${stepLabel}: unexpected experienceId ${item.experienceId}`);
    }
  }
  const returned = new Set(items.map((i) => i.experienceId));
  for (const id of chunkIds) {
    if (!returned.has(id)) {
      throw new Error(`${stepLabel}: missing rewrite for experience ${id}`);
    }
  }
}

export const rewriteExperiences = createStep({
  id: "rewrite-experiences",
  description: "LLM rewrite of portfolio experiences in chunks of 3",
  inputSchema: ApplyPackageWorkflowStateSchema,
  outputSchema: ApplyPackageWorkflowStateSchema,
  execute: async ({ inputData, mastra }): Promise<ApplyPackageWorkflowState> => {
    const state = inputData;
    const experiences = state.portfolio.experiences;

    if (experiences.length === 0) {
      return { ...state, experienceRewrites: [] };
    }

    const agent = mastra?.getAgent("applyPackageAgent");
    const { model, skipNote } = generateModelOption(state.llm as RuntimeLlmConfig | undefined);

    if (!agent || !model) {
      throw new Error(
        skipNote ?? (!agent ? "apply_package_agent_unavailable" : "apply_package_model_unavailable")
      );
    }

    const requestContext = applyPackageRequestContext(
      state.llm as RuntimeLlmConfig | undefined,
      state.applicationId
    );
    const chunks = chunkArray(experiences, APPLY_PACKAGE_REWRITE_CHUNK_SIZE);
    const merged: ExperienceRewrite[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const stepLabel = `rewrite-experiences (chunk ${i + 1}/${chunks.length})`;
      const chunkIds = new Set(chunk.map((e) => e.id));
      const prompt = buildExperienceChunkPrompt(state.jobBrief, chunk, i + 1, chunks.length);
      const started = Date.now();
      let success = false;

      try {
        const result = await raceGenerate(
          agent,
          prompt,
          ApplyPackageExperienceRewriteChunkSchema,
          model,
          requestContext,
          {
            maxOutputTokens: REWRITE_MAX_OUTPUT_TOKENS,
            timeoutMs: REWRITE_CHUNK_TIMEOUT_MS,
            stepLabel
          }
        );

        assertChunkCoverage(stepLabel, chunkIds, result.items);
        merged.push(...result.items);
        success = true;
      } finally {
        try {
          const log = createAgentLogger({ operation: "agent__apply_package_rewrite_experiences" });
          log.set({
            event: "apply_package_rewrite_chunk",
            stepId: "rewrite-experiences",
            applicationId: state.applicationId,
            chunkIndex: i + 1,
            chunkCount: chunks.length,
            chunkSize: chunk.length,
            durationMs: Date.now() - started,
            success
          });
          log.emit();
        } catch {
          // Logging must not fail the rewrite step.
        }
      }
    }

    return { ...state, experienceRewrites: merged };
  }
});
