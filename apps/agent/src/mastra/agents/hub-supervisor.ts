import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { createCrmApplicationMatcherAgent } from "#@/mastra/agents/crm-application-matcher-agent";
import { createCrmStageAdvisorAgent } from "#@/mastra/agents/crm-stage-advisor-agent";
import { createJobNotifierMailExtractorAgent } from "#@/mastra/agents/job-notifier-mail-extractor-agent";
import { createJobPageExtractorAgent } from "#@/mastra/agents/job-page-extractor-agent";
import { createJobPreferenceMatchScorerAgent } from "#@/mastra/agents/job-preference-match-scorer-agent";
import { createMailClassifierAgent } from "#@/mastra/agents/mail-classifier-agent";
import { createMailReplyAgent } from "#@/mastra/agents/mail-reply-agent";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { createHubInputProcessors } from "#@/mastra/processors/hub-processors";
import { createApplicationTool } from "#@/mastra/tools/create-application.tool";
import { generateApplyPackageTool } from "#@/mastra/tools/generate-apply-package.tool";
import { getApplicationTool } from "#@/mastra/tools/get-application.tool";
import { getExperienceTool } from "#@/mastra/tools/get-experience.tool";
import { getJobPreferencesTool } from "#@/mastra/tools/get-job-preferences.tool";
import { getProjectTool } from "#@/mastra/tools/get-project.tool";
import { getResumeTool } from "#@/mastra/tools/get-resume.tool";
import { getStackTool } from "#@/mastra/tools/get-stack.tool";
import { listExperiencesTool } from "#@/mastra/tools/list-experiences.tool";
import { listOpenApplicationsTool } from "#@/mastra/tools/list-open-applications.tool";
import { listProjectsTool } from "#@/mastra/tools/list-projects.tool";
import { listResumesTool } from "#@/mastra/tools/list-resumes.tool";
import { listStacksTool } from "#@/mastra/tools/list-stacks.tool";
import { proposeApplicationFromJdTool } from "#@/mastra/tools/propose-application-from-jd.tool";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { mailClassifyWorkflow } from "#@/mastra/workflows/mail-classify-workflow";
import { mailJobHarvestWorkflow } from "#@/mastra/workflows/mail-job-harvest-workflow";
import { mailProcessWorkflow } from "#@/mastra/workflows/mail-process-workflow";
import { mailReplyWorkflow } from "#@/mastra/workflows/mail-reply-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";

/**
 * Hub capability inventory (product wiring — no weather demo).
 *
 * | Surface        | Hub-exposed                                                                 | Intentionally not on hub                                      |
 * | -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
 * | Tools          | CRM/evidence reads, propose JD, create-application, generate-apply-package  | fetch-job-page (used by harvest/extractor agents)             |
 * | Agents         | stack, mail classify/reply, harvest extractors, CRM matcher/stage advisor   | applyPackageAgent, jobAgentTake, providerPing, resume extractor |
 * | Workflows      | detect/organize stacks, resume import, mail process/classify/harvest/reply  | applyPackageWorkflow (via generate-apply-package tool + HITL) |
 *
 * Long multi-step workflows opt into Mastra background tasks (manager +
 * Postgres domain required — enabled on the Mastra instance). HITL tools stay
 * foreground: create-application, generate-apply-package, and approval-gated
 * workflows still use requireToolApproval before execute.
 */
export function createHubSupervisor() {
  return new Agent({
    id: "hub-supervisor",
    name: "Hub Supervisor",
    description:
      "Coordinates the personal hub: stacks, resume import, Career Inbox classify/harvest/CRM, and applications help.",
    instructions: `You are the Hub Supervisor — the single point of contact for the user's personal hub.

## Tenant / identity
- All work is scoped to the authenticated user. \`requestContext.userId\` is set by the server.
- When invoking workflows that require a \`userId\` input, use ONLY the authenticated user's id from context. Never invent, guess, or substitute another userId.
- CRM and evidence tools resolve tenant from requestContext only — do not pass userId as a tool argument.

## Capabilities (inventory — do not re-list after tools)
Stacks: \`stackCategorizerAgent\`, \`detectStacksWorkflow\`, \`organizeStacksWorkflow\`, \`resumeImportWorkflow\`.
Career mail (prefer workflows): \`mailProcessWorkflow\`, \`mailClassifyWorkflow\`, \`mailJobHarvestWorkflow\`, \`mailReplyWorkflow\`.
Specialists when a focused step is enough: \`mailClassifierAgent\`, \`jobNotifierMailExtractor\`, \`jobPageExtractor\`, \`jobPreferenceMatchScorer\`, \`crmApplicationMatcher\`, \`crmStageAdvisor\`, \`mailReplyAgent\`.
CRM reads: \`listOpenApplications\`, \`getApplication\`.
CRM write / HITL: \`propose-application-from-jd\` (client confirm card), \`create-application\` (after save|package).
Evidence reads: \`listExperiences\`, \`getExperience\`, \`listProjects\`, \`getProject\`, \`listStacks\`, \`getStack\`, \`listResumes\`, \`getResume\`, \`getJobPreferences\`.
Apply package (HITL approval): \`generateApplyPackage\` — application must already exist; never invent package success.
Long jobs (detect/organize/import/mail process/harvest) may run as background tasks — acknowledge briefly and wait for results if the stream continues; do not invent completion.

## Response discipline (critical)
- Intermediate steps: prefer **tools only** (or one short status sentence). Never dump full capability lists mid-loop.
- Exactly **one** user-facing final answer after tools complete for the turn — no rephrase, rewrite, or re-list of the same content.
- Meta / capability questions ("what can you do?", help, overview): answer from this prompt only — **zero tools, zero sub-agents, zero workflows**. One short answer then **stop** (do not call tools "to illustrate", do not produce a second draft).
- Only invoke a specialist, workflow, or tool when the user asks for a concrete action that needs live data or mutation.
- Prefer a workflow over a sub-agent for defined multi-step processes.
- State which specialist/workflow you invoke (one short sentence) when you do.
- JD paste or explicit apply/import intent → call \`propose-application-from-jd\` (structured proposal card; full description required). **Do not invent CRM rows** without that tool and user confirmation.
- After proposal tool output: \`dismiss\` → short ack, no create. \`save\` → \`create-application\` (merge any \`edits\` into fields). \`package\` → \`create-application\` then \`generate-apply-package\` with the returned applicationId.
- Apply package → only via \`generate-apply-package\` after the user chose the package path and an application already exists. Never invent package success.
- Do not invent tools or pretend a send/apply succeeded without tool results.
- Surface empty/error tool results plainly.
- Keep responses concise and actionable.`,
    model: byoModelFromRequestContext,
    inputProcessors: createHubInputProcessors(),
    /**
     * Long workflows: background dispatch (Mastra manager + Postgres).
     * Keys are agent/workflows registration names (framework strips agent-/workflow- prefixes).
     * HITL tools are intentionally omitted so approval stays on the chat stream.
     */
    backgroundTasks: {
      tools: {
        detectStacksWorkflow: { enabled: true, timeoutMs: 900_000 },
        organizeStacksWorkflow: { enabled: true, timeoutMs: 900_000 },
        resumeImportWorkflow: { enabled: true, timeoutMs: 600_000 },
        mailProcessWorkflow: { enabled: true, timeoutMs: 600_000 },
        mailJobHarvestWorkflow: { enabled: true, timeoutMs: 900_000 },
        mailClassifyWorkflow: { enabled: true, timeoutMs: 300_000 }
        // mailReplyWorkflow: foreground — draft quality needed in-turn
        // createApplication / generateApplyPackage: HITL foreground only
      }
    },
    /**
     * maxSteps: 4 (align with packages/api HUB_CHAT_MAX_STEPS).
     * Multi-step enables real tool chains (read → propose → package).
     * Rewrite/bubble churn is fixed by Response discipline instructions + UI
     * intermediate-text collapse — not by maxSteps=1.
     * HITL: require approval for mutating workflows + expensive apply package.
     */
    defaultOptions: {
      maxSteps: 4,
      /**
       * Root anti-rewrite: never start another agentic iteration after a
       * text-only step (finishReason stop / no tool calls). Multi-step is only
       * for tool → tool → final text chains. Without this, some models keep
       * drafting new capability answers until maxSteps.
       */
      onIterationComplete: async (ctx) => {
        const toolCount = ctx.toolCalls?.length ?? 0;
        if (toolCount === 0 && (ctx.finishReason === "stop" || Boolean(ctx.text?.trim()))) {
          return { continue: false };
        }
        return { continue: true };
      },
      /**
       * Limit parent history forwarded to specialists/workflows — full tool
       * dumps blow sub-agent context and confuse narrow skills.
       */
      delegation: {
        messageFilter: ({ messages }) => {
          // Forward recent text turns only — drop tool-invocation parts so
          // specialists don't inherit huge detect/organize/CRM tool dumps.
          const withoutToolParts = messages.filter((m) => {
            const parts = m.content?.parts;
            if (!Array.isArray(parts) || parts.length === 0) return true;
            return !parts.some((p) => p?.type === "tool-invocation");
          });
          return withoutToolParts.slice(-8);
        }
      },
      requireToolApproval: ({ toolName }) =>
        // Workflow tools are exposed as agent tools named after the workflow id / key.
        // generate-apply-package is the thin CRM package bridge (HITL).
        // create-application must not silently insert tracked rows without HITL.
        /organizeStacks|detectStacks|resumeImport|mailProcess|mailJobHarvest|mailReply|mailClassify|generate-apply-package|generateApplyPackage|create-application|createApplication/i.test(
          toolName
        )
    },
    tools: {
      listOpenApplications: listOpenApplicationsTool,
      getApplication: getApplicationTool,
      listExperiences: listExperiencesTool,
      getExperience: getExperienceTool,
      listProjects: listProjectsTool,
      getProject: getProjectTool,
      listStacks: listStacksTool,
      getStack: getStackTool,
      listResumes: listResumesTool,
      getResume: getResumeTool,
      getJobPreferences: getJobPreferencesTool,
      proposeApplicationFromJd: proposeApplicationFromJdTool,
      createApplication: createApplicationTool,
      generateApplyPackage: generateApplyPackageTool
    },
    agents: {
      stackCategorizerAgent: createStackCategorizerAgent(),
      mailClassifierAgent: createMailClassifierAgent(),
      mailReplyAgent: createMailReplyAgent(),
      jobNotifierMailExtractor: createJobNotifierMailExtractorAgent(),
      jobPageExtractor: createJobPageExtractorAgent(),
      jobPreferenceMatchScorer: createJobPreferenceMatchScorerAgent(),
      crmApplicationMatcher: createCrmApplicationMatcherAgent(),
      crmStageAdvisor: createCrmStageAdvisorAgent()
    },
    workflows: {
      detectStacksWorkflow,
      organizeStacksWorkflow,
      resumeImportWorkflow,
      mailProcessWorkflow,
      mailClassifyWorkflow,
      mailJobHarvestWorkflow,
      mailReplyWorkflow
    },
    memory: new Memory({
      options: {
        lastMessages: 20,
        observationalMemory: true
      }
    })
  });
}
