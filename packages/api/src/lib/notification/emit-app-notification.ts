import {
  defaultNotificationChannelPrefs,
  NOTIFICATION_KIND_LABELS,
  type NotificationKind
} from "@tsu-stack/core";
import {
  appNotificationRepository,
  userNotificationSettingsRepository,
  type AppNotificationEntity
} from "@tsu-stack/db";

export type EmitAppNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title?: string;
  body?: string | null;
  href?: string | null;
  messageId?: string | null;
  applicationId?: string | null;
  reviewItemId?: string | null;
};

/**
 * Create an in-app notification when the user's channel prefs allow `app: true`.
 * Email channel is ignored here (product mail later).
 */
export async function emitAppNotification(
  input: EmitAppNotificationInput
): Promise<AppNotificationEntity | null> {
  const settings = await userNotificationSettingsRepository.findByUserId(input.userId);
  const channels = settings?.channels ?? defaultNotificationChannelPrefs();
  const toggle = channels[input.kind];
  if (toggle && toggle.app === false) {
    return null;
  }

  return appNotificationRepository.create({
    userId: input.userId,
    kind: input.kind,
    title: input.title ?? NOTIFICATION_KIND_LABELS[input.kind],
    body: input.body ?? null,
    href: input.href ?? null,
    messageId: input.messageId ?? null,
    applicationId: input.applicationId ?? null,
    reviewItemId: input.reviewItemId ?? null
  });
}
