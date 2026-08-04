import { createStep, createWorkflow } from "@mastra/core/workflows";

import {
  ApplyPackageDraftSchema,
  ApplyPackageWorkflowInputSchema,
  type ApplyPackageDraft,
  type ApplyPackageWorkflowInput,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

import { generateModelOption } from "#@/mastra/byo-model";
import { applyPackageRequestContext } from "#@/mastra/workflows/apply-package-workflow/llm-shared";
import {
  descriptionUsed,
  prepareContext
} from "#@/mastra/workflows/apply-package-workflow/prepare.step";

export { prepareContext };
export {
  applyPackageRequestContext,
  raceGenerate,
  REWRITE_CHUNK_TIMEOUT_MS,
  LETTERS_TIMEOUT_MS,
  REWRITE_MAX_OUTPUT_TOKENS,
  LETTERS_MAX_OUTPUT_TOKENS
} from "#@/mastra/workflows/apply-package-workflow/llm-shared";
export {
  ApplyPackageJobBriefSchema,
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

const GENERATE_TIMEOUT_MS = 150_000;

/**
 * Keep only portfolio-known ids; drop hallucinated membership.
 * Does not invent missing rows — schema requires arrays of grounded items.
 */
function sanitizeDraftIds(
  draft: ApplyPackageDraft,
  portfolio: ApplyPackageWorkflowInput["portfolio"]
): ApplyPackageDraft {
  const expIds = new Set(portfolio.experiences.map((e) => e.id));
  const projectIds = new Set(portfolio.projects.map((p) => p.id));
  const stackIds = new Set(portfolio.stacks.map((s) => s.id));

  return {
    ...draft,
    experiences: draft.experiences.filter((e) => expIds.has(e.experienceId)),
    projects: draft.projects.filter((p) => projectIds.has(p.projectId)),
    stacks: draft.stacks.filter((s) => stackIds.has(s.stackId))
  };
}

/** Single-shot draft step — replaced by multi-step chain in Task 6. */
const analyzeAndDraft = createStep({
  id: "analyze-and-draft",
  description: "LLM selects portfolio evidence, rewrites bullets, drafts cover letter and outreach",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageDraftSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("applyPackageAgent");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);

    if (!agent || !model) {
      throw new Error(
        skipNote ?? (!agent ? "apply_package_agent_unavailable" : "apply_package_model_unavailable")
      );
    }

    const ctx = descriptionUsed(inputData);
    const portfolioJson = {
      profile: inputData.portfolio.profile,
      contacts: inputData.portfolio.contacts,
      experiences: inputData.portfolio.experiences.map((e) => {
        return {
          id: e.id,
          title: e.title,
          organization: e.organization,
          description: e.description.slice(0, 2_500),
          fromDate: e.fromDate ?? null,
          toDate: e.toDate ?? null,
          isPresent: e.isPresent ?? false
        };
      }),
      projects: inputData.portfolio.projects.map((p) => {
        return {
          id: p.id,
          title: p.title,
          summary: p.summary.slice(0, 1_200),
          description: p.description.slice(0, 2_500),
          // Private signal for rewrite only — skill forbids printing as Analysis
          analysis: p.analysis?.slice(0, 2_000) ?? null,
          year: p.year
        };
      }),
      stacks: inputData.portfolio.stacks
    };

    const jobJson = {
      title: inputData.job.title,
      companyName: inputData.job.companyName,
      description: ctx.descriptionUsed,
      listingUrl: ctx.listingUrl,
      listingFetched: ctx.listingFetched,
      applyUrl: inputData.job.applyUrl ?? null,
      applyMethod: inputData.job.applyMethod ?? null,
      matchScore: inputData.job.matchScore ?? null,
      location: inputData.job.location ?? null,
      salaryRange: inputData.job.salaryRange ?? null,
      notes: inputData.job.notes ?? null,
      source: inputData.job.source ?? null
    };

    const prompt = `Build an apply package draft for this application.

Activate the **application-apply-package** skill first, then draft.

applicationId: ${inputData.applicationId}
generatedAt should be an ISO-8601 timestamp (use current time).

Job (JSON):
${JSON.stringify(jobJson, null, 2)}

Portfolio snapshot (JSON):
${JSON.stringify(portfolioJson, null, 2)}

jobContext must reflect title/company, descriptionUsed (the description you used), listingFetched=${ctx.listingFetched}, listingUrl=${ctx.listingUrl ?? "null"}.

Return the full structured ApplyPackageDraft only.`;

    const requestContext = applyPackageRequestContext(
      inputData.llm as RuntimeLlmConfig | undefined,
      inputData.applicationId
    );

    const result = await Promise.race([
      agent.generate([{ role: "user", content: prompt }], {
        structuredOutput: { schema: ApplyPackageDraftSchema },
        model,
        requestContext
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`apply package generate timeout ${GENERATE_TIMEOUT_MS}ms`)),
          GENERATE_TIMEOUT_MS
        )
      )
    ]);

    const parsed = ApplyPackageDraftSchema.safeParse(result.object);
    if (!parsed.success) {
      throw new Error(`apply_package_schema_failed: ${parsed.error.message.slice(0, 200)}`);
    }

    const withIds = sanitizeDraftIds(
      {
        ...parsed.data,
        applicationId: inputData.applicationId,
        generatedAt:
          parsed.data.generatedAt.trim().length > 0
            ? parsed.data.generatedAt
            : new Date().toISOString(),
        jobContext: {
          title: inputData.job.title,
          companyName: inputData.job.companyName,
          descriptionUsed:
            parsed.data.jobContext.descriptionUsed.trim().length > 0
              ? parsed.data.jobContext.descriptionUsed
              : ctx.descriptionUsed,
          listingFetched: ctx.listingFetched,
          listingUrl: ctx.listingUrl
        }
      },
      inputData.portfolio
    );

    const final = ApplyPackageDraftSchema.safeParse(withIds);
    if (!final.success) {
      throw new Error(`apply_package_sanitize_failed: ${final.error.message.slice(0, 200)}`);
    }

    return final.data;
  }
});

export const applyPackageWorkflow = createWorkflow({
  id: "apply-package-workflow",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageDraftSchema
}).then(analyzeAndDraft);

applyPackageWorkflow.commit();
