import { ApplicationStageSchema, type ApplicationStage } from "@tsu-stack/core";

/** Open pipeline stages the hub tool may set. `applied` is send-only. */
const HUB_ALLOWED_STAGES = new Set<ApplicationStage>(["saved", "screening", "interview", "offer"]);

export type StageGuardResult =
  | { ok: true; stage: ApplicationStage }
  | { ok: false; code: "APPLIED_VIA_SEND_ONLY" | "INVALID_STAGE" | "TERMINAL_OUTCOME" };

/**
 * Reject target stage `applied` (and unknown/terminal labels).
 * Applied is only set by successful sendApplyOutreach.
 */
export function assertStageAllowedForHubTool(stage: string): StageGuardResult {
  const parsed = ApplicationStageSchema.safeParse(stage);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_STAGE" };
  }
  if (parsed.data === "applied") {
    return { ok: false, code: "APPLIED_VIA_SEND_ONLY" };
  }
  if (!HUB_ALLOWED_STAGES.has(parsed.data)) {
    return { ok: false, code: "INVALID_STAGE" };
  }
  return { ok: true, stage: parsed.data };
}
