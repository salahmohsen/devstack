import { z } from "zod";

/** Optional career inbound address (must be on the user's Resend receiving domain). */
export const MailInboundAddressSchema = z
  .string()
  .trim()
  .email("Enter a valid inbound email address")
  .max(320)
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v.toLowerCase()));

export const MailSettingsOutputSchema = z.object({
  /** When false, inbound webhook returns 503 for this tenant. */
  inboundEnabled: z.boolean(),
  /**
   * Address that should receive career mail (optional soft-match on webhook).
   * Empty string coerced to null so forms never choke on blank DB values.
   */
  inboundAddress: z
    .union([z.string().email(), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v)),
  hasResendApiKey: z.boolean(),
  resendApiKeyLast4: z.string().max(4).nullable(),
  hasWebhookSecret: z.boolean(),
  webhookSecretLast4: z.string().max(4).nullable(),
  /** Opaque path segment for multi-tenant BYO webhook URL. */
  webhookToken: z.string().min(1),
  /** Absolute webhook URL to paste into the Resend dashboard. */
  webhookUrl: z.string().url(),
  updatedAt: z.coerce.date().nullable()
});
export type MailSettingsOutput = z.infer<typeof MailSettingsOutputSchema>;

export const UpdateMailSettingsInputSchema = z.object({
  inboundEnabled: z.boolean().optional(),
  inboundAddress: z.string().trim().max(320).optional().nullable(),
  /** New Resend API key; omit to keep existing. */
  resendApiKey: z.string().min(1).max(512).optional(),
  clearResendApiKey: z.boolean().optional(),
  /** New Resend webhook signing secret (`whsec_…`); omit to keep. */
  webhookSecret: z.string().min(1).max(512).optional(),
  clearWebhookSecret: z.boolean().optional(),
  /** Rotate path token (invalidates previous Resend webhook URL). */
  rotateWebhookToken: z.boolean().optional()
});
export type UpdateMailSettingsInput = z.infer<typeof UpdateMailSettingsInputSchema>;

export const TestMailSettingsInputSchema = z.object({
  /** Probe this key instead of the saved one (configure dialog). */
  resendApiKey: z.string().min(1).max(512).optional()
});
export type TestMailSettingsInput = z.infer<typeof TestMailSettingsInputSchema>;

export const TestMailSettingsOutputSchema = z.object({
  ok: z.boolean(),
  apiKey: z.enum(["valid", "invalid", "missing"]),
  webhookSecret: z.enum(["present", "missing", "invalid_format"]),
  message: z.string()
});
export type TestMailSettingsOutput = z.infer<typeof TestMailSettingsOutputSchema>;
