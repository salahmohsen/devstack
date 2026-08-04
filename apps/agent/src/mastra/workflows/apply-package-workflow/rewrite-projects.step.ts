import { createStep } from "@mastra/core/workflows";

import {
  APPLY_PACKAGE_REWRITE_CHUNK_SIZE,
  ApplyPackageProjectRewriteChunkSchema,
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

type ProjectItem = ApplyPackageWorkflowState["portfolio"]["projects"][number];
type ProjectRewrite = ApplyPackageWorkflowState["projectRewrites"][number];

function buildProjectChunkPrompt(
  jobBrief: ApplyPackageJobBrief,
  chunk: ProjectItem[],
  chunkIndex: number,
  chunkCount: number
): string {
  const items = chunk.map((p) => {
    return {
      projectId: p.id,
      title: p.title,
      summary: p.summary.slice(0, 1_200),
      description: p.description.slice(0, 1_200),
      // Private signal for rewrite only — skill forbids printing as Analysis
      analysis: p.analysis?.slice(0, 800) ?? null,
      year: p.year
    };
  });

  return `Rewrite portfolio projects for this job application (chunk ${chunkIndex}/${chunkCount}).

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

Projects to rewrite (JSON). Use each projectId exactly as given:
${JSON.stringify(items, null, 2)}

Rules:
- Return one item per projectId above — no extras, no omissions.
- rewrittenSummary: short tailored blurb grounded in summary/description (+ private analysis when present).
- Optional rewrittenBullets only when source text supports them.
- Keep project title/name as provided (do not rename).
- Private analysis is rewrite signal only: never print "Analysis:", never quote it as a labeled section, never put "private analysis" into the rewrite text.
- Do not invent metrics, tools, or achievements not grounded in the source.
- Return a single JSON object shaped as { "items": [ { "projectId", "rewrittenSummary", optional "rewrittenBullets" }, ... ] }.
- Never return a bare top-level array — always wrap rewrites under "items".`;
}

function assertChunkCoverage(
  stepLabel: string,
  chunkIds: Set<string>,
  items: Array<{ projectId: string }>
): void {
  for (const item of items) {
    if (!chunkIds.has(item.projectId)) {
      throw new Error(`${stepLabel}: unexpected projectId ${item.projectId}`);
    }
  }
  const returned = new Set(items.map((i) => i.projectId));
  for (const id of chunkIds) {
    if (!returned.has(id)) {
      throw new Error(`${stepLabel}: missing rewrite for project ${id}`);
    }
  }
}

export const rewriteProjects = createStep({
  id: "rewrite-projects",
  description: "LLM rewrite of portfolio projects in chunks of 3",
  inputSchema: ApplyPackageWorkflowStateSchema,
  outputSchema: ApplyPackageWorkflowStateSchema,
  execute: async ({ inputData, mastra }): Promise<ApplyPackageWorkflowState> => {
    const state = inputData;
    const projects = state.portfolio.projects;

    if (projects.length === 0) {
      return { ...state, projectRewrites: [] };
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
    const chunks = chunkArray(projects, APPLY_PACKAGE_REWRITE_CHUNK_SIZE);
    const merged: ProjectRewrite[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const stepLabel = `rewrite-projects (chunk ${i + 1}/${chunks.length})`;
      const chunkIds = new Set(chunk.map((p) => p.id));
      const prompt = buildProjectChunkPrompt(state.jobBrief, chunk, i + 1, chunks.length);
      const started = Date.now();
      let success = false;

      try {
        const result = await raceGenerate(
          agent,
          prompt,
          ApplyPackageProjectRewriteChunkSchema,
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
          const log = createAgentLogger({ operation: "agent__apply_package_rewrite_projects" });
          log.set({
            event: "apply_package_rewrite_chunk",
            stepId: "rewrite-projects",
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

    return { ...state, projectRewrites: merged };
  }
});
