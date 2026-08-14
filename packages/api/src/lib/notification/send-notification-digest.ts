import {
  appNotificationRepository,
  userNotificationSettingsRepository,
  userRepository
} from "@tsu-stack/db";
import { NotificationDigestEmail, sendEmail } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

/**
 * Send one digest email for a user's pending digest notifications.
 * Marks rows emailed; no-ops when empty.
 */
export async function sendNotificationDigestForUser(userId: string): Promise<{
  sent: boolean;
  count: number;
}> {
  const pending = await appNotificationRepository.listPendingDigestForUser(userId, 50);
  if (pending.length === 0) return { sent: false, count: 0 };

  const settings = await userNotificationSettingsRepository.findByUserId(userId);
  let to = settings?.notificationEmail?.trim() ?? null;
  if (!to) {
    const user = await userRepository.findById(userId);
    to = user?.email?.trim() ?? null;
  }
  if (!to) return { sent: false, count: 0 };

  const base = ENV_SERVER.VITE_WEB_URL.replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard`;

  try {
    await sendEmail({
      to,
      subject: `Career digest · ${pending.length} update${pending.length === 1 ? "" : "s"}`,
      template: NotificationDigestEmail({
        items: pending.map((p) => {
          return {
            title: p.title,
            body: p.body,
            href: p.href
          };
        }),
        dashboardUrl,
        logoUrl: `${base}/logo192.png`
      })
    });
  } catch {
    return { sent: false, count: 0 };
  }

  await appNotificationRepository.markDigestEmailed(
    pending.map((p) => p.id),
    userId
  );
  await userNotificationSettingsRepository.markDigestSent(userId);
  return { sent: true, count: pending.length };
}
