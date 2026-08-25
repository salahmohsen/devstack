import { createStep } from "@mastra/core/workflows";

import { ApplyPackageSummaryAndLettersSchema, type RuntimeLlmConfig } from "@tsu-stack/core";

import { createAgentLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import {
  applyPackageRequestContext,
  LETTERS_MAX_OUTPUT_TOKENS,
  LETTERS_TIMEOUT_MS,
  raceGenerate
} from "#@/mastra/workflows/apply-package-workflow/llm-shared";
import {
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageJobBrief,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

function buildLettersPrompt(
  jobBrief: ApplyPackageJobBrief,
  state: ApplyPackageWorkflowState
): string {
  const portfolio = state.portfolio;
  const experienceEvidence = state.experienceRewrites.map((r) => {
    const source = portfolio.experiences.find((e) => e.id === r.experienceId);
    return {
      experienceId: r.experienceId,
      title: source?.title ?? null,
      organization: source?.organization ?? null,
      rewrittenBullets: r.rewrittenBullets
    };
  });
  const projectEvidence = state.projectRewrites.map((r) => {
    const source = portfolio.projects.find((p) => p.id === r.projectId);
    return {
      projectId: r.projectId,
      title: source?.title ?? null,
      rewrittenSummary: r.rewrittenSummary,
      rewrittenBullets: r.rewrittenBullets ?? null
    };
  });
  const stackNames = portfolio.stacks.map((s) => {
    return { stackId: s.id, name: s.name };
  });

  return `Draft professional summary, cover letter, and recruiter outreach for this job application.

Follow application-apply-package letter rules. Tools are disabled — return JSON only.

applicationId: ${state.applicationId}

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

Profile (JSON):
${JSON.stringify(portfolio.profile ?? null, null, 2)}

Contacts (JSON):
${JSON.stringify(portfolio.contacts ?? null, null, 2)}

Rewritten experiences (evidence only — do not invent beyond these bullets):
${JSON.stringify(experienceEvidence, null, 2)}

Rewritten projects (evidence only — do not invent beyond these summaries/bullets):
${JSON.stringify(projectEvidence, null, 2)}

Stacks (names only):
${JSON.stringify(stackNames, null, 2)}

Rules:
- professionalSummary: optional 2–4 sentence tailored summary grounded in profile + rewritten evidence + job; null if nothing useful to say.
- headline: target-role line only (fair title, optional years/scope). Do not rename past employers. Empty string if nothing fair to say.
- coverLetterBody: formal ~3–5 short paragraphs; company/role; proof from rewritten evidence only.
- outreachSubject: one professional line (company + role when natural).
- outreachBody: short recruiter outreach (~80–150 words); plain text; not a full cover letter paste.
- proposedRecruiterEmail: only if a plausible contact email appears in the job brief description; else null. Never invent emails.
- notes: optional short reviewer notes (fit highlights, thin JD caveats). Not an ATS score.
- Light tweaks only: reorder + mirror phrasing where true. No leverage/synergy/utilize/spearheaded/results-driven unless already in the seeker's text.
- Prose: never use em dashes (—), en dashes (–), or spaced double hyphens (--). Prefer commas, periods, colons, or parentheses. Plain is/are/has voice.
- Do not invent employers, titles, metrics, tools, or achievements.
- Do not rename companies/roles/projects.
- atsVendor: omit or use a string host guess; never null (use null only for proposedRecruiterEmail / professionalSummary when empty).
- Return structured output only (professionalSummary, headline, coverLetterBody, outreachSubject, outreachBody, proposedRecruiterEmail, optional notes / jdBuckets / keywordDualForms / atsVendor).`;
}

export const draftSummaryAndLetters = createStep({
  id: "draft-summary-and-letters",
  description: "LLM professional summary, cover letter, and outreach from rewritten evidence",
  inputSchema: ApplyPackageWorkflowStateSchema,
  outputSchema: ApplyPackageWorkflowStateSchema,
  execute: async ({ inputData, mastra }): Promise<ApplyPackageWorkflowState> => {
    const state = inputData;
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
    const stepLabel = "draft-summary-and-letters";
    const prompt = buildLettersPrompt(state.jobBrief, state);
    const started = Date.now();
    let success = false;

    try {
      const parsed = await raceGenerate(
        agent,
        prompt,
        ApplyPackageSummaryAndLettersSchema,
        model,
        requestContext,
        {
          maxOutputTokens: LETTERS_MAX_OUTPUT_TOKENS,
          timeoutMs: LETTERS_TIMEOUT_MS,
          stepLabel
        }
      );
      success = true;
      return { ...state, letters: parsed };
    } finally {
      try {
        const log = createAgentLogger({ operation: "agent__apply_package_draft_letters" });
        log.set({
          event: "apply_package_draft_letters",
          stepId: "draft-summary-and-letters",
          applicationId: state.applicationId,
          durationMs: Date.now() - started,
          success
        });
        log.emit();
      } catch {
        // Logging must not fail the letters step.
      }
    }
  }
});
