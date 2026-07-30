import { randomUUID } from "node:crypto";

import {
  defaultNotificationChannelPrefs,
  defaultNotificationSettingsOutput,
  EmailDeliveryModeSchema,
  mergeNotificationChannels,
  NotificationSettingsOutputSchema,
  UpdateNotificationSettingsInputSchema,
  type EmailDeliveryMode,
  type NotificationChannelPrefs
} from "@tsu-stack/core";
import { userNotificationSettingsRepository, userRepository } from "@tsu-stack/db";
import { type StoredNotificationChannels } from "@tsu-stack/db/schema";

import { protectedProcedure } from "#@/lib/procedures/factory";

async function accountEmailFor(userId: string): Promise<string> {
  const user = await userRepository.findById(userId);
  if (!user?.email) {
    throw new Error("User email missing");
  }
  return user.email;
}

function parseDeliveryMode(raw: string | null | undefined): EmailDeliveryMode {
  const parsed = EmailDeliveryModeSchema.safeParse(raw);
  return parsed.success ? parsed.data : "immediate";
}

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof userNotificationSettingsRepository.findByUserId>>>,
  accountEmail: string
) {
  return NotificationSettingsOutputSchema.parse({
    notificationEmail: row.notificationEmail ?? accountEmail,
    accountEmail,
    channels: row.channels,
    emailDeliveryMode: parseDeliveryMode(row.emailDeliveryMode),
    updatedAt: row.updatedAt
  });
}

export const notificationSettingsRouter = {
  get: protectedProcedure
    .route({
      description: "Get notification preferences and notification email",
      method: "GET"
    })
    .output(NotificationSettingsOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const accountEmail = await accountEmailFor(userId);
      const row = await userNotificationSettingsRepository.findByUserId(userId);
      if (!row) return defaultNotificationSettingsOutput(accountEmail);
      return toOutput(row, accountEmail);
    }),

  update: protectedProcedure
    .route({
      description: "Update notification email and per-kind channel prefs",
      method: "POST"
    })
    .input(UpdateNotificationSettingsInputSchema)
    .output(NotificationSettingsOutputSchema)
    .errors({
      EMAIL_INVALID: {
        message: "Enter a valid notification email address.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const accountEmail = await accountEmailFor(userId);
      const existing = await userNotificationSettingsRepository.findByUserId(userId);

      let notificationEmail: string | null = existing?.notificationEmail ?? accountEmail;

      if (input.notificationEmail !== undefined) {
        const raw = input.notificationEmail?.trim() ?? "";
        if (raw === "") {
          notificationEmail = accountEmail;
        } else {
          const parsed = zEmailSafe(raw);
          if (!parsed) throw errors.EMAIL_INVALID();
          notificationEmail = parsed;
        }
      }

      const baseChannels: NotificationChannelPrefs =
        (existing?.channels as NotificationChannelPrefs | undefined) ??
        defaultNotificationChannelPrefs();
      const channels = mergeNotificationChannels(
        baseChannels,
        input.channels
      ) as StoredNotificationChannels;

      const emailDeliveryMode: EmailDeliveryMode =
        input.emailDeliveryMode ?? parseDeliveryMode(existing?.emailDeliveryMode);

      const row = await userNotificationSettingsRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        notificationEmail,
        channels,
        emailDeliveryMode
      });

      return toOutput(row, accountEmail);
    })
};

function zEmailSafe(value: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 320) return null;
  return value.toLowerCase();
}
