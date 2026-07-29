import {
  defaultNotificationChannelPrefs,
  NOTIFICATION_KIND_LABELS,
  type NotificationKind
} from "@tsu-stack/core";
import {
  appNotificationRepository,
  userNotificationSettingsRepository,
  userRepository,
  type AppNotificationEntity
} from "@tsu-stack/db";
import { AppNotificationEmail, sendEmail } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

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

function absoluteActionUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  const base = ENV_SERVER.VITE_WEB_URL.replace(/\/$/, "");
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${base}${path}`;
}

/**
 * Emit in-app and/or email notification based on the user's channel prefs for `kind`.
 * App row and email are independent; email failures do not roll back the app row.
 */
export async function emitAppNotification(
  input: EmitAppNotificationInput
): Promise<AppNotificationEntity | null> {
  const settings = await userNotificationSettingsRepository.findByUserId(input.userId);
  const channels = settings?.channels ?? defaultNotificationChannelPrefs();
  const toggle = channels[input.kind] ?? { app: true, email: false };

  const title = input.title ?? NOTIFICATION_KIND_LABELS[input.kind];
  const body = input.body ?? null;
  const href = input.href ?? null;

  let row: AppNotificationEntity | null = null;
  if (toggle.app !== false) {
    row = await appNotificationRepository.create({
      userId: input.userId,
      kind: input.kind,
      title,
      body,
      href,
      messageId: input.messageId ?? null,
      applicationId: input.applicationId ?? null,
      reviewItemId: input.reviewItemId ?? null
    });
  }

  if (toggle.email === true) {
    await sendNotificationEmail({
      userId: input.userId,
      notificationEmail: settings?.notificationEmail ?? null,
      title,
      body,
      href
    });
  }

  return row;
}

async function sendNotificationEmail(input: {
  userId: string;
  notificationEmail: string | null;
  title: string;
  body: string | null;
  href: string | null;
}): Promise<void> {
  try {
    let to = input.notificationEmail?.trim() ?? null;
    if (!to) {
      const user = await userRepository.findById(input.userId);
      to = user?.email?.trim() ?? null;
    }
    if (!to) return;

    const actionUrl = absoluteActionUrl(input.href);
    await sendEmail({
      to,
      subject: input.title,
      template: AppNotificationEmail({
        title: input.title,
        body: input.body,
        actionUrl,
        actionLabel: actionUrl?.includes("/review") ? "Open Review" : "Open dashboard"
      })
    });
  } catch {
    // Never fail classify/CRM/review paths on outbound notification mail.
  }
}
