import { userGmailSyncRepository } from "@tsu-stack/db";

import { syncGmailInbox } from "#@/lib/gmail/sync-gmail-inbox";

/**
 * Pub/Sub push body (base64 data) contains Gmail notification JSON:
 * { emailAddress, historyId }
 * We map email → user via user_gmail_sync.emailAddress and run History sync.
 */
export async function handleGmailPushNotification(rawBody: string): Promise<{
  handled: number;
  skipped: number;
}> {
  let emailAddress: string | null = null;
  try {
    const envelope = JSON.parse(rawBody) as {
      message?: { data?: string };
    };
    const dataB64 = envelope.message?.data;
    if (!dataB64) return { handled: 0, skipped: 0 };
    const decoded = Buffer.from(dataB64, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as { emailAddress?: string; historyId?: string };
    emailAddress = payload.emailAddress?.trim().toLowerCase() ?? null;
  } catch {
    return { handled: 0, skipped: 0 };
  }

  if (!emailAddress) return { handled: 0, skipped: 0 };

  const all = await userGmailSyncRepository.listByEmailAddress(emailAddress);
  if (all.length === 0) return { handled: 0, skipped: 0 };

  let handled = 0;
  let skipped = 0;
  for (const row of all) {
    if (row.autoSyncEnabled === false) {
      skipped += 1;
      continue;
    }
    const result = await syncGmailInbox(row.userId);
    if (result.ok) handled += 1;
    else skipped += 1;
  }
  return { handled, skipped };
}
