import { z } from "zod";

import {
  ApplicationOutcomeSchema,
  ApplicationStageSchema,
  type ApplicationOutcome,
  type ApplicationStage
} from "#@/application/types";
import { APPLICATION_STAGES } from "#@/application/utils";

import { MAIL_SYSTEM_LABELS } from "./constants";
import { MailSystemLabelSchema, type MailSystemLabel } from "./types";

/**
 * Primary system career label → suggested application stage.
 * Used by classify → CRM auto-apply (wave 6). Never invent stages outside this map.
 */
export const MAIL_SYSTEM_LABEL_TO_STAGE = {
  application: "applied",
  recruiter: "screening",
  interview: "interview",
  offer: "offer"
} as const satisfies Record<MailSystemLabel, ApplicationStage>;

/** Board order index for monotonic stage advances (higher = further along). */
export function applicationStageRank(stage: ApplicationStage): number {
  const idx = APPLICATION_STAGES.indexOf(stage);
  return idx < 0 ? 0 : idx;
}

/** Prefer the further-along stage; ties keep `a`. */
export function maxApplicationStage(a: ApplicationStage, b: ApplicationStage): ApplicationStage {
  return applicationStageRank(b) > applicationStageRank(a) ? b : a;
}

/**
 * Highest stage suggested by system labels on a message.
 * Returns null when no system career labels (unsorted / smart-rule only).
 */
export function proposedStageFromSystemLabels(labels: readonly string[]): ApplicationStage | null {
  let best: ApplicationStage | null = null;
  for (const label of labels) {
    if (!(MAIL_SYSTEM_LABELS as readonly string[]).includes(label)) continue;
    const system = label as MailSystemLabel;
    const stage = MAIL_SYSTEM_LABEL_TO_STAGE[system];
    best = best ? maxApplicationStage(best, stage) : stage;
  }
  return best;
}

/**
 * Monotonic advance: only move forward (or stay). Never downgrade.
 * When current is null (new/unlinked), returns proposed as-is.
 */
export function resolveMonotonicStage(input: {
  current: ApplicationStage | null | undefined;
  proposed: ApplicationStage | null | undefined;
}): ApplicationStage | null {
  const { current, proposed } = input;
  if (!proposed) return current ?? null;
  if (!current) return proposed;
  return maxApplicationStage(current, proposed);
}

/** What the worker would do to Applications CRM for one classified message. */
export const MailCrmEffectKindSchema = z.enum([
  /** No CRM mutation (unsorted / already linked with no stage move). */
  "noop",
  /** Set mail_message.applicationId only (stage already at/above target). */
  "link_only",
  /** Link + advance stage (and stageChangedAt). */
  "advance_stage",
  /** Terminal outcome (reserved; classify v1 does not auto-reject). */
  "set_outcome"
]);
export type MailCrmEffectKind = z.infer<typeof MailCrmEffectKindSchema>;

export const MailCrmEffectProposalSchema = z.object({
  kind: MailCrmEffectKindSchema,
  /** Target application when known (match by company/title later). */
  applicationId: z.string().min(1).nullable().optional(),
  targetStage: ApplicationStageSchema.optional(),
  targetOutcome: ApplicationOutcomeSchema.nullable().optional(),
  systemLabels: z.array(MailSystemLabelSchema).default([]),
  /** Short machine reason for logs / audit. */
  reason: z.string().min(1)
});
export type MailCrmEffectProposal = z.infer<typeof MailCrmEffectProposalSchema>;

/** Before/after snapshot for undo (persisted in a later ticket). */
export const MailCrmAuditSnapshotSchema = z.object({
  applicationId: z.string().nullable(),
  stage: ApplicationStageSchema.nullable(),
  stageChangedAt: z.coerce.date().nullable(),
  outcome: ApplicationOutcomeSchema.nullable(),
  outcomeAt: z.coerce.date().nullable(),
  mailMessageApplicationId: z.string().nullable()
});
export type MailCrmAuditSnapshot = z.infer<typeof MailCrmAuditSnapshotSchema>;

export const MailCrmApplyResultSchema = z.object({
  applied: z.boolean(),
  effect: MailCrmEffectProposalSchema,
  before: MailCrmAuditSnapshotSchema.optional(),
  after: MailCrmAuditSnapshotSchema.optional()
});
export type MailCrmApplyResult = z.infer<typeof MailCrmApplyResultSchema>;

/**
 * Pure proposal from classify labels + optional current application state.
 * Does not touch DB; worker/repository tickets apply this.
 */
export function proposeMailCrmEffect(input: {
  systemLabels: readonly string[];
  /** Existing mail_message.applicationId if any. */
  mailApplicationId?: string | null;
  /** Linked application's current stage when known. */
  currentStage?: ApplicationStage | null;
  /** Linked application already has a terminal outcome. */
  currentOutcome?: ApplicationOutcome | null;
}): MailCrmEffectProposal {
  const systemLabels = input.systemLabels.filter((l): l is MailSystemLabel =>
    (MAIL_SYSTEM_LABELS as readonly string[]).includes(l)
  );

  if (systemLabels.length === 0) {
    return {
      kind: "noop",
      applicationId: input.mailApplicationId ?? null,
      systemLabels: [],
      reason: "no_system_labels"
    };
  }

  if (input.currentOutcome) {
    return {
      kind: "noop",
      applicationId: input.mailApplicationId ?? null,
      systemLabels,
      reason: "application_closed"
    };
  }

  const proposed = proposedStageFromSystemLabels(systemLabels);
  if (!proposed) {
    return {
      kind: "noop",
      applicationId: input.mailApplicationId ?? null,
      systemLabels,
      reason: "no_stage_mapping"
    };
  }

  const next = resolveMonotonicStage({
    current: input.currentStage,
    proposed
  });

  const applicationId = input.mailApplicationId ?? null;

  if (!applicationId) {
    // Match/create is a later ticket — still propose the stage target.
    return {
      kind: "advance_stage",
      applicationId: null,
      targetStage: next ?? proposed,
      systemLabels,
      reason: "unlinked_needs_match"
    };
  }

  if (
    input.currentStage &&
    next &&
    applicationStageRank(next) <= applicationStageRank(input.currentStage)
  ) {
    return {
      kind: "link_only",
      applicationId,
      targetStage: input.currentStage,
      systemLabels,
      reason: "stage_already_at_or_beyond"
    };
  }

  return {
    kind: "advance_stage",
    applicationId,
    targetStage: next ?? proposed,
    systemLabels,
    reason: "advance_stage"
  };
}
