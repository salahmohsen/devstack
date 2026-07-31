import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { HarvestedJobSchema, harvestJobsFromMailBody } from "@tsu-stack/core";

/**
 * Mail job harvest extract workflow (Mastra Studio + optional agent worker).
 *
 * Persist/score/notify live in apps/server `runMailJobHarvest`.
 * Primary path parses job cards from the notifier email body (reliable for LinkedIn).
 */
const inputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromEmail: z.string().default(""),
  subject: z.string().default(""),
  bodyText: z.string().default(""),
  bodyHtml: z.string().nullable().optional()
});

const extractFromMail = createStep({
  id: "extract-jobs-from-mail",
  description: "Parse job listing URLs and card fields from notifier email body",
  inputSchema,
  outputSchema: z.object({
    messageId: z.string(),
    userId: z.string(),
    jobs: z.array(HarvestedJobSchema),
    notes: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const jobs = harvestJobsFromMailBody({
      bodyText: inputData.bodyText,
      bodyHtml: inputData.bodyHtml,
      subject: inputData.subject,
      fromEmail: inputData.fromEmail
    });
    return {
      messageId: inputData.messageId,
      userId: inputData.userId,
      jobs,
      notes: jobs.length === 0 ? "no_job_urls_in_mail" : `extracted_${jobs.length}`
    };
  }
});

export const mailJobHarvestWorkflow = createWorkflow({
  id: "mail-job-harvest-workflow",
  inputSchema,
  outputSchema: extractFromMail.outputSchema
}).then(extractFromMail);

mailJobHarvestWorkflow.commit();
