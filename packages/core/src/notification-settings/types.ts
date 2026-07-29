import { z } from "zod";

export const NotificationKindSchema = z.enum([
  "mail.reply.draft_ready",
  "mail.classified.important",
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
  "mail.reply.draft_ready": NotificationChannelToggleSchema,
  "mail.classified.important": NotificationChannelToggleSchema,
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

export const NotificationSettingsOutputSchema = z.object({
  notificationEmail: z.string().email().nullable(),
  /** Account email for “use account email” affordance. */
  accountEmail: z.string().email(),
  channels: NotificationChannelPrefsSchema,
  updatedAt: z.coerce.date().nullable()
});
export type NotificationSettingsOutput = z.infer<typeof NotificationSettingsOutputSchema>;

export const UpdateNotificationSettingsInputSchema = z.object({
  notificationEmail: z.string().trim().max(320).optional().nullable(),
  channels: NotificationChannelPrefsSchema.partial().optional()
});
export type UpdateNotificationSettingsInput = z.infer<typeof UpdateNotificationSettingsInputSchema>;
