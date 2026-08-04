import { z } from "zod";

import { isMastraProviderId } from "./mastra-provider-catalog";

export const AiFeatureSchema = z.enum([
  "classify",
  "reply",
  "resumeImport",
  "stacks",
  "hubChat",
  "scorer",
  "applyPackage"
]);
export type AiFeature = z.infer<typeof AiFeatureSchema>;

/**
 * Mastra model-router provider id (from @mastra/core provider-registry) or `custom`.
 * Full catalog: `MASTRA_PROVIDER_CATALOG` / {@link isMastraProviderId}.
 * Kept as `string` (not a 160-way enum) so Zod/TS stay tractable.
 */
export const AiProviderKindSchema = z
  .string()
  .min(1)
  .max(64)
  .superRefine((value, ctx) => {
    if (value === "custom" || isMastraProviderId(value)) return;
    ctx.addIssue({
      code: "custom",
      message: "Unknown AI provider (must be a Mastra model-router provider id or custom)"
    });
  });
export type AiProviderKind = string;

/** Mail reply: Assist = confirm in Review; Full = auto-send (AI settings only). */
export const MailReplyAutonomySchema = z.enum(["assist", "full"]);
export type MailReplyAutonomy = z.infer<typeof MailReplyAutonomySchema>;

/** Public view of a provider — secret never returned. */
export const AiProviderPublicSchema = z.object({
  id: z.string().min(1),
  kind: AiProviderKindSchema,
  label: z.string().min(1).max(80),
  hasApiKey: z.boolean(),
  apiKeyLast4: z.string().max(4).nullable()
});
export type AiProviderPublic = z.infer<typeof AiProviderPublicSchema>;

/** Mastra model router ids (`provider/model`) or bare model names. */
export const AiModelIdSchema = z.string().min(1).max(200);

export const AiModelsMapSchema = z.object({
  classify: AiModelIdSchema,
  reply: AiModelIdSchema,
  resumeImport: AiModelIdSchema,
  stacks: AiModelIdSchema,
  hubChat: AiModelIdSchema,
  scorer: AiModelIdSchema,
  applyPackage: AiModelIdSchema
});
export type AiModelsMap = z.infer<typeof AiModelsMapSchema>;

export const AiSettingsOutputSchema = z.object({
  providers: z.array(AiProviderPublicSchema),
  models: AiModelsMapSchema,
  mailReplyAutonomy: MailReplyAutonomySchema,
  updatedAt: z.coerce.date().nullable()
});
export type AiSettingsOutput = z.infer<typeof AiSettingsOutputSchema>;

/** Upsert provider: omit apiKey to keep existing secret. */
export const AiProviderUpsertSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  kind: AiProviderKindSchema,
  label: z.string().min(1).max(80),
  /** New key only; empty/omitted keeps previous. */
  apiKey: z.string().min(1).max(512).optional()
});
export type AiProviderUpsert = z.infer<typeof AiProviderUpsertSchema>;

export const UpdateAiSettingsInputSchema = z.object({
  providers: z.array(AiProviderUpsertSchema).max(20).optional(),
  /** When true with providers[], replace full provider list (including deletions). */
  replaceProviders: z.boolean().optional(),
  models: AiModelsMapSchema.partial().optional(),
  mailReplyAutonomy: MailReplyAutonomySchema.optional()
});
export type UpdateAiSettingsInput = z.infer<typeof UpdateAiSettingsInputSchema>;
