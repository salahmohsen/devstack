import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  DetectStacksWorkflowInputSchema,
  MailClassifyInputSchema,
  MailJobHarvestWorkflowInputSchema,
  MailProcessInputSchema,
  OrganizeStacksInputSchema,
  ResumeImportWorkflowInputSchema
} from "@tsu-stack/core";

import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { mailClassifyWorkflow } from "#@/mastra/workflows/mail-classify-workflow";
import { mailJobHarvestWorkflow } from "#@/mastra/workflows/mail-job-harvest-workflow";
import { mailProcessWorkflow } from "#@/mastra/workflows/mail-process-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";

const HubBackgroundStartResultSchema = z.object({
  runId: z.string(),
  status: z.literal("started")
});

async function startWorkflowInBackground(
  workflow: {
    createRun: (options?: { resourceId?: string }) => Promise<{
      startAsync: (args: never) => Promise<{ runId: string }>;
    }>;
  },
  inputData: unknown,
  requestContext: unknown,
  resourceId?: string
) {
  const run = await workflow.createRun({ resourceId });
  return run.startAsync({
    inputData,
    requestContext
  } as never);
}

function createHubBackgroundWorkflowTool(opts: {
  id: string;
  description: string;
  timeoutMs: number;
  inputSchema: z.ZodType;
  workflow: Parameters<typeof startWorkflowInBackground>[0];
}) {
  return createTool({
    id: opts.id,
    description: opts.description,
    inputSchema: z.object({
      inputData: opts.inputSchema
    }),
    outputSchema: HubBackgroundStartResultSchema,
    background: {
      enabled: true,
      timeoutMs: opts.timeoutMs
    },
    execute: async ({ inputData }, context) => {
      const userId = context.requestContext?.get?.("userId");
      const resourceId = typeof userId === "string" && userId.length > 0 ? userId : undefined;
      const { runId } = await startWorkflowInBackground(
        opts.workflow,
        inputData,
        context.requestContext,
        resourceId
      );
      return { runId, status: "started" as const };
    }
  });
}

/** Opted-in long jobs. Instance backgroundTasks manager stays off. */
export const detectStacksWorkflowTool = createHubBackgroundWorkflowTool({
  id: "detectStacksWorkflow",
  description:
    "Start stack detection for a project. Long job: returns { runId, status: started } immediately. Do not invent stacks.",
  timeoutMs: 900_000,
  inputSchema: DetectStacksWorkflowInputSchema,
  workflow: detectStacksWorkflow
});

export const organizeStacksWorkflowTool = createHubBackgroundWorkflowTool({
  id: "organizeStacksWorkflow",
  description:
    "Start stack organize/merge/rename. Long job: returns { runId, status: started }. Do not invent results.",
  timeoutMs: 900_000,
  inputSchema: OrganizeStacksInputSchema,
  workflow: organizeStacksWorkflow
});

export const resumeImportWorkflowTool = createHubBackgroundWorkflowTool({
  id: "resumeImportWorkflow",
  description:
    "Start resume import extract. Long job: returns { runId, status: started }. Do not invent the draft.",
  timeoutMs: 600_000,
  inputSchema: ResumeImportWorkflowInputSchema,
  workflow: resumeImportWorkflow
});

export const mailProcessWorkflowTool = createHubBackgroundWorkflowTool({
  id: "mailProcessWorkflow",
  description:
    "Start Career Inbox process for one message. Long job: returns { runId, status: started }.",
  timeoutMs: 600_000,
  inputSchema: MailProcessInputSchema,
  workflow: mailProcessWorkflow
});

export const mailClassifyWorkflowTool = createHubBackgroundWorkflowTool({
  id: "mailClassifyWorkflow",
  description:
    "Start Career Inbox classify for one message. Long job: returns { runId, status: started }.",
  timeoutMs: 300_000,
  inputSchema: MailClassifyInputSchema,
  workflow: mailClassifyWorkflow
});

export const mailJobHarvestWorkflowTool = createHubBackgroundWorkflowTool({
  id: "mailJobHarvestWorkflow",
  description:
    "Start job-notifier harvest for one message. Long job: returns { runId, status: started }.",
  timeoutMs: 900_000,
  inputSchema: MailJobHarvestWorkflowInputSchema,
  workflow: mailJobHarvestWorkflow
});
