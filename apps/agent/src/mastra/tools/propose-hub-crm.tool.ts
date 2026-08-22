import { createTool } from "@mastra/core/tools";

import {
  ProposeApplicationFieldChangeInputSchema,
  ProposeApplicationFieldChangeOutputSchema,
  ProposeBatchTrackingChangeInputSchema,
  ProposeBatchTrackingChangeOutputSchema,
  ProposeDeleteApplicationInputSchema,
  ProposeDeleteApplicationOutputSchema,
  ProposeDeleteNoteInputSchema,
  ProposeDeleteNoteOutputSchema,
  ProposeRefreshFromUrlInputSchema,
  ProposeRefreshFromUrlOutputSchema,
  ProposeSetOutcomeInputSchema,
  ProposeSetOutcomeOutputSchema
} from "@tsu-stack/core";

/**
 * HITL CRM writes. No execute — Confirm cards persist via client dashboard
 * mutations. After calling, write no user-facing text.
 */
export const proposeApplicationFieldChangeTool = createTool({
  id: "propose-application-field-change",
  description:
    "Propose an application listing/CRM field update for Confirm File Diff. Input: applicationId, currentMarkdown, proposedMarkdown (generated application.md of identity + editable CRM columns), patch (location, salary, urgency, source, URL, work mode, title, company, description, …). Do NOT include kit JSON, analysis, or a JD dump unless the patch is description. After calling, write no user-facing text. After confirm, do NOT call listNewJobs or proposeNewJobsTriage.",
  inputSchema: ProposeApplicationFieldChangeInputSchema,
  outputSchema: ProposeApplicationFieldChangeOutputSchema
});

export const proposeSetOutcomeTool = createTool({
  id: "propose-set-outcome",
  description:
    "Propose closing a tracked application with an outcome (rejected | withdrawn | ghosted | accepted) for user Confirm. Close labels only — do not invent a Rejected stage. After calling, write no user-facing text.",
  inputSchema: ProposeSetOutcomeInputSchema,
  outputSchema: ProposeSetOutcomeOutputSchema
});

export const proposeDeleteApplicationTool = createTool({
  id: "propose-delete-application",
  description:
    "Propose permanently deleting an application for destructive Confirm. After calling, write no user-facing text. Cancel writes nothing.",
  inputSchema: ProposeDeleteApplicationInputSchema,
  outputSchema: ProposeDeleteApplicationOutputSchema
});

export const proposeDeleteNoteTool = createTool({
  id: "propose-delete-note",
  description:
    "Propose deleting an activity note (kind must be note) for Confirm. Pass noteId + applicationId from getApplication activity. After calling, write no user-facing text.",
  inputSchema: ProposeDeleteNoteInputSchema,
  outputSchema: ProposeDeleteNoteOutputSchema
});

export const proposeBatchTrackingChangeTool = createTool({
  id: "propose-batch-tracking-change",
  description:
    "Propose a batch track | dismiss | restore of application ids for one Confirm card. After Confirm the client loops existing per-id trackJob / dismissJob / restoreApplication. Do not invent a batchTrack tool. After calling, write no user-facing text.",
  inputSchema: ProposeBatchTrackingChangeInputSchema,
  outputSchema: ProposeBatchTrackingChangeOutputSchema
});

export const proposeRefreshFromUrlTool = createTool({
  id: "propose-refresh-from-url",
  description:
    "Propose re-fetching an application listing from a URL for Confirm. Pass applicationId + a real http(s) url. After calling, write no user-facing text.",
  inputSchema: ProposeRefreshFromUrlInputSchema,
  outputSchema: ProposeRefreshFromUrlOutputSchema
});
