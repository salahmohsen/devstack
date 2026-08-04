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
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { mailClassifyWorkflow } from "#@/mastra/workflows/mail-classify-workflow";
import { mailJobHarvestWorkflow } from "#@/mastra/workflows/mail-job-harvest-workflow";
import { mailProcessWorkflow } from "#@/mastra/workflows/mail-process-workflow";
import { mailReplyWorkflow } from "#@/mastra/workflows/mail-reply-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";

/**
 * Hub supervisor — single /dashboard chat orchestrator.
 * Career mail agents/workflows are the same ones queues use (no second path).
 *
 * Tenant auth: chat handlers set `requestContext.userId` from the session.
 * When starting workflows that take a `userId` input field, that value MUST be
 * the authenticated user's id from context — never invent or accept a different
 * tenant id. CRM tools never take `userId` from tool input (requestContext only).
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
- CRM tools resolve tenant from requestContext only — do not pass userId as a tool argument.

## Stacks & projects
- \`stackCategorizerAgent\` — classify packages into stack types
- \`detectStacksWorkflow\` — scan repos for tech stacks
- \`organizeStacksWorkflow\` — merge/rename/cleanup stack library
- \`resumeImportWorkflow\` — resume import extraction pipeline

## Career Inbox & Applications (AI-first)
Prefer workflows for multi-step mail work:
- \`mailProcessWorkflow\` — classify a mail (+ smart filters) and return branch harvest|crm|noise|none
- \`mailClassifyWorkflow\` — classify only
- \`mailJobHarvestWorkflow\` — extract/score jobs from a job_notifier mail (needs full mail payload)
- \`mailReplyWorkflow\` — draft a career reply

Specialists (delegate when the user asks for a focused step):
- \`mailClassifierAgent\` — system + smart-filter labels
- \`jobNotifierMailExtractor\` — multi-source job extract from digests
- \`jobPageExtractor\` — enrich one listing URL
- \`jobPreferenceMatchScorer\` — score jobs vs prefs
- \`crmApplicationMatcher\` — match/create application from mail
- \`crmStageAdvisor\` — propose stage/outcome
- \`mailReplyAgent\` — reply draft

## Response discipline (critical)
- Answer once. Never rephrase, rewrite, or re-list the same answer.
- Meta / capability questions ("what can you do?", help, overview): answer from this prompt only — **zero tools, zero sub-agents**.
- Only invoke a specialist or workflow when the user asks for a concrete action that needs live data or mutation.
- When you do call tools: call them in the **first** model turn (parallel ok). The next turn is final text only — no more tools.
- After tool/workflow results, one short final answer — do not produce another full capability list.
- State which specialist/workflow you invoke (one short sentence) when you do.
- Prefer a workflow over a sub-agent for defined multi-step processes.
- Do not invent tools or pretend a send/apply succeeded without tool results.
- Surface empty/error tool results plainly.
- Keep responses concise and actionable.`,
    model: byoModelFromRequestContext,
    /**
     * maxSteps: 1 (align with packages/api HUB_CHAT_MAX_STEPS).
     * Multi-step loops were rewriting the same user-visible answer N times.
     * One LLM turn only: answer and/or tool calls in a single step — no rewrite pass.
     * HITL: require approval for mutating workflows.
     */
    defaultOptions: {
      maxSteps: 1,
      requireToolApproval: ({ toolName }) =>
        // Workflow tools are exposed as agent tools named after the workflow id.
        /organizeStacks|detectStacks|resumeImport|mailProcess|mailJobHarvest|mailReply|mailClassify/i.test(
          toolName
        )
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
      options: { lastMessages: 20 }
    })
  });
}
