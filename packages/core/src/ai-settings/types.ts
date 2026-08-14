import { z } from "zod";

import { HubAvatarIdSchema, HubPersonalityIdSchema } from "./hub-personality";
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

/** Per-feature provider row id binding (which key row supplies generate/test). */
export const AiModelProviderIdsMapSchema = z.object({
  classify: z.string().min(1).max(64).optional(),
  reply: z.string().min(1).max(64).optional(),
  resumeImport: z.string().min(1).max(64).optional(),
  stacks: z.string().min(1).max(64).optional(),
  hubChat: z.string().min(1).max(64).optional(),
  scorer: z.string().min(1).max(64).optional(),
  applyPackage: z.string().min(1).max(64).optional()
});
export type AiModelProviderIdsMap = z.infer<typeof AiModelProviderIdsMapSchema>;

export const AiSettingsOutputSchema = z.object({
  providers: z.array(AiProviderPublicSchema),
  models: AiModelsMapSchema,
  modelProviderIds: AiModelProviderIdsMapSchema.default({}),
  hubPersonality: HubPersonalityIdSchema.default("cairo"),
  hubAvatar: HubAvatarIdSchema.default("scarab"),
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
  modelProviderIds: AiModelProviderIdsMapSchema.optional(),
  hubPersonality: HubPersonalityIdSchema.optional(),
  hubAvatar: HubAvatarIdSchema.optional()
});
export type UpdateAiSettingsInput = z.infer<typeof UpdateAiSettingsInputSchema>;

/**
 * Probe a provider API key via a cheap BYO generate (Mastra model router).
 * Prefer draft `apiKey`; fall back to sealed key for `providerId`.
 */
export const TestAiProviderInputSchema = z
  .object({
    kind: AiProviderKindSchema,
    /** Unsaved draft key from the form. Preferred when present. */
    apiKey: z.string().min(1).max(512).optional(),
    /** Saved provider row id — used when apiKey is omitted. */
    providerId: z.string().min(1).max(64).optional(),
    /**
     * Optional model override (`provider/model`).
     * Defaults to a catalog model for `kind`, or a user model bound to that kind.
     */
    modelId: AiModelIdSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (!value.apiKey?.trim() && !value.providerId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Provide an API key or a saved provider id",
        path: ["apiKey"]
      });
    }
  });
export type TestAiProviderInput = z.infer<typeof TestAiProviderInputSchema>;

export const TestAiProviderOutputSchema = z.object({
  ok: z.boolean(),
  /** Model used for the probe (Mastra `provider/model`). */
  modelId: z.string().nullable(),
  latencyMs: z.number().int().nonnegative(),
  /** Short user-facing status — never includes the API key. */
  message: z.string().min(1).max(500)
});
export type TestAiProviderOutput = z.infer<typeof TestAiProviderOutputSchema>;

/**
 * List live/fallback models for a provider kind.
 * Prefer draft `apiKey`; fall back to sealed key for `providerId`.
 */
export const ListProviderModelsInputSchema = z
  .object({
    kind: AiProviderKindSchema,
    providerId: z.string().min(1).max(64).optional(),
    apiKey: z.string().min(1).max(512).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.apiKey?.trim() && !value.providerId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Provide an API key or a saved provider id",
        path: ["apiKey"]
      });
    }
  });
export type ListProviderModelsInput = z.infer<typeof ListProviderModelsInputSchema>;

export const ListProviderModelsOutputSchema = z.object({
  models: z.array(
    z.object({
      /** Full Mastra `provider/model` id. */
      id: z.string().min(1),
      label: z.string().min(1)
    })
  ),
  source: z.enum(["live", "fallback", "empty"]),
  providerId: z.string().nullable(),
  /** Short user-facing status — never includes the API key. */
  errorMessage: z.string().max(500).optional()
});
export type ListProviderModelsOutput = z.infer<typeof ListProviderModelsOutputSchema>;
