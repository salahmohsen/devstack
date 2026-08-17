import { createTool } from "@mastra/core/tools";

import {
  ProposeEvidenceChangeInputSchema,
  ProposeEvidenceChangeOutputSchema
} from "@tsu-stack/core";

/**
 * HITL confirm for project / experience / stack writes. No execute — the
 * confirm card persists via client oRPC. There is no apply-evidence-change tool.
 */
export const proposeEvidenceChangeTool = createTool({
  id: "propose-evidence-change",
  description:
    "Propose one project, experience, or stack create/edit for user confirm. Do not call until required goals are filled (evidenceGoalsReady). One entity per call. Omit id on create; pass a real id from searchEvidence / getProject / getExperience / getStack to edit. For project summary/description edits: getProject first and ground the patch in analysis (or add the user's new facts to patch.analysis too). Confirm is blocked if analysis is empty or the copy is ungrounded. patch is the column delta; currentMarkdown and proposedMarkdown are generated views of current vs proposed columns — do not put analysis in the File Diff. After calling, write no user-facing text; the confirm card writes. After confirm, do NOT call listNewJobs, proposeNewJobsTriage, findJobsNow, or openEntityForm. Never invent an id.",
  inputSchema: ProposeEvidenceChangeInputSchema,
  outputSchema: ProposeEvidenceChangeOutputSchema
});
