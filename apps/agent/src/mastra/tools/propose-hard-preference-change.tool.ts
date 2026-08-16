import { createTool } from "@mastra/core/tools";

import {
  ProposeHardPreferenceChangeInputSchema,
  ProposeHardPreferenceChangeOutputSchema
} from "@tsu-stack/core";

/**
 * HITL confirm for hard stops. No execute — the confirm card writes via
 * client `jobPreference.upsert`. There is no apply-hard-preference-change tool.
 */
export const proposeHardPreferenceChangeTool = createTool({
  id: "propose-hard-preference-change",
  description:
    "Propose a hard-stop preference change for user confirm: salary floor (salaryMin + salaryCurrency), exclude keywords (list patch add|remove|set), or level floor (junior|mid|senior|staff). Never infer these from prose — always call this tool. After calling, write no user-facing text; the confirm card is the UI and performs the write. Do not call upsert-soft-job-preferences or upsert-job-preferences for hard stops.",
  inputSchema: ProposeHardPreferenceChangeInputSchema,
  outputSchema: ProposeHardPreferenceChangeOutputSchema
});
