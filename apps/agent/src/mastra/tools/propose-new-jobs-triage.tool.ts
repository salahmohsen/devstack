import { createTool } from "@mastra/core/tools";

import { ProposeNewJobsTriageInputSchema, ProposeNewJobsTriageOutputSchema } from "@tsu-stack/core";

export { proposeMailCrmChangeTool } from "./propose-mail-crm-change.tool.ts";

/**
 * Client HITL tool — New jobs Track/Dismiss card.
 *
 * **No `execute`:** suspend so hub UI can show the card and resume via
 * `addToolOutput` (`confirm` | `cancel` + id lists). Mirror propose-from-jd.
 *
 * Never write track/dismiss here — only after confirm via trackJob/dismissJob.
 */
export const proposeNewJobsTriageTool = createTool({
  id: "propose-new-jobs-triage",
  description:
    "Propose New jobs triage (also when the user says show / filter / screen / sort / narrow new work or new jobs): track[] and dismiss[] with id, title, companyName, matchScore, reason from the last listNewJobs rows. If you have no dismiss split, put every listed job in track[]. Never call with both arrays empty when listNewJobs returned rows. Wait for user Confirm/Cancel. After calling this tool, write no user-facing text — the card is the confirmation UI. Do NOT call trackJob or dismissJob before this tool returns confirm with ids. After confirm, do NOT call this tool again this turn. Cap rows (~10) to fit step budget.",
  inputSchema: ProposeNewJobsTriageInputSchema,
  outputSchema: ProposeNewJobsTriageOutputSchema
});
