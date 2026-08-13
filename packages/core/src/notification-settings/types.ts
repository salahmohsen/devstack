import { z } from "zod";

export const NotificationKindSchema = z.enum([
  "mail.classified.important",
  "mail.needs_action",
  "mail.apply_nudge",
  "mail.job_alerts_ready",
  "application.stage_auto",
  "workflow.finished",
  "security.new_device_otp"
]);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const NotificationChannelToggleSchema = z.object({
  app: z.boolean(),
  email: z.boolean()
});
export type NotificationChannelToggle = z.infer<typeof NotificationChannelToggleSchema>;

export const NotificationChannelPrefsSchema = z.object({
  "mail.classified.important": NotificationChannelToggleSchema,
  "mail.needs_action": NotificationChannelToggleSchema,
  "mail.apply_nudge": NotificationChannelToggleSchema,
  "mail.job_alerts_ready": NotificationChannelToggleSchema,
  "application.stage_auto": NotificationChannelToggleSchema,
  "workflow.finished": NotificationChannelToggleSchema,
  "security.new_device_otp": NotificationChannelToggleSchema
});
export type NotificationChannelPrefs = z.infer<typeof NotificationChannelPrefsSchema>;

export const NotificationEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(320)
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v));

/** How career email notifications are delivered (security OTP always immediate). */
export const EmailDeliveryModeSchema = z.enum(["immediate", "digest"]);
export type EmailDeliveryMode = z.infer<typeof EmailDeliveryModeSchema>;

export const NotificationSettingsOutputSchema = z.object({
  notificationEmail: z.string().email().nullable(),
  /** Account email for “use account email” affordance. */
  accountEmail: z.string().email(),
  channels: NotificationChannelPrefsSchema,
  emailDeliveryMode: EmailDeliveryModeSchema,
  updatedAt: z.coerce.date().nullable()
});
export type NotificationSettingsOutput = z.infer<typeof NotificationSettingsOutputSchema>;

export const UpdateNotificationSettingsInputSchema = z.object({
  notificationEmail: z.string().trim().max(320).optional().nullable(),
  channels: NotificationChannelPrefsSchema.partial().optional(),
  emailDeliveryMode: EmailDeliveryModeSchema.optional()
});
export type UpdateNotificationSettingsInput = z.infer<typeof UpdateNotificationSettingsInputSchema>;
