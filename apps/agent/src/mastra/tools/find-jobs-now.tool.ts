import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { FindJobsNowOutputSchema } from "@tsu-stack/core";

/**
 * Client enqueue of the existing Find jobs now pipeline. No server execute.
 * Hub UI calls jobDiscovery.findNow, starts the toast without awaiting poll.
 */
export const findJobsNowTool = createTool({
  id: "find-jobs-now",
  description:
    "Queue Find jobs now (same ingest/land/inbox/caps as the header button). Client enqueues and returns { enqueued, seats, reason } immediately — do not wait for land. After the result, tell the user search is queued (or the reason). Call listNewJobs / proposeNewJobsTriage only if the inbox is already non-empty. Do not auto-triage an empty inbox.",
  inputSchema: z.object({}).describe("No arguments. Tenant is the session user."),
  outputSchema: FindJobsNowOutputSchema
});
