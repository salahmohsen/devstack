import {
  defaultNotificationChannelPrefs,
  IMMEDIATE_EMAIL_NOTIFICATION_KINDS,
  NOTIFICATION_KIND_LABELS,
  type EmailDeliveryMode,
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

function mustEmailImmediately(kind: NotificationKind): boolean {
  return (IMMEDIATE_EMAIL_NOTIFICATION_KINDS as readonly string[]).includes(kind);
}

/**
 * Emit in-app and/or email notification based on the user's channel prefs for `kind`.
 * Digest mode queues email for the hourly batch (except security OTP).
 * Never throws — callers in classify/CRM/draft must not fail on notification.
 */
export async function emitAppNotification(
  input: EmitAppNotificationInput
): Promise<AppNotificationEntity | null> {
  try {
    return await emitAppNotificationInner(input);
  } catch {
    return null;
  }
}

async function emitAppNotificationInner(
  input: EmitAppNotificationInput
): Promise<AppNotificationEntity | null> {
  const settings = await userNotificationSettingsRepository.findByUserId(input.userId);
  const channels = settings?.channels ?? defaultNotificationChannelPrefs();
  const toggle = channels[input.kind] ?? { app: true, email: false };
  const deliveryMode: EmailDeliveryMode =
    settings?.emailDeliveryMode === "digest" ? "digest" : "immediate";

  const title = input.title ?? NOTIFICATION_KIND_LABELS[input.kind];
  const body = input.body ?? null;
  const href = input.href ?? null;

  const wantsEmail = toggle.email === true;
  const wantsApp = toggle.app !== false;
  const queueDigest = wantsEmail && deliveryMode === "digest" && !mustEmailImmediately(input.kind);

  let row: AppNotificationEntity | null = null;
  // Persist when app channel on, or when we need a digest queue row.
  if (wantsApp || queueDigest) {
    row = await appNotificationRepository.create({
      userId: input.userId,
      kind: input.kind,
      title,
      body,
      href,
      messageId: input.messageId ?? null,
      applicationId: input.applicationId ?? null,
      reviewItemId: input.reviewItemId ?? null,
      emailDigestPending: queueDigest,
      // Only stamp emailedAt after a successful immediate send below.
      emailedAt: null,
      // Hide pure digest-queue rows from unread noise when app is off.
      ...(wantsApp ? {} : { readAt: new Date() })
    });
  }

  if (wantsEmail && !queueDigest) {
    const sent = await sendNotificationEmail({
      userId: input.userId,
      notificationEmail: settings?.notificationEmail ?? null,
      title,
      body,
      href
    });
    if (sent && row) {
      await appNotificationRepository.markEmailed(row.id, input.userId);
    }
  }

  return row;
}

/** @returns true when Resend accepted the message */
export async function sendNotificationEmail(input: {
  userId: string;
  notificationEmail: string | null;
  title: string;
  body: string | null;
  href: string | null;
}): Promise<boolean> {
  try {
    let to = input.notificationEmail?.trim() ?? null;
    if (!to) {
      const user = await userRepository.findById(input.userId);
      to = user?.email?.trim() ?? null;
    }
    if (!to) return false;

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
    return true;
  } catch {
    return false;
  }
}

export { absoluteActionUrl };
