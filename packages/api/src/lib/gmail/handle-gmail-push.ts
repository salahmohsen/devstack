import { userGmailSyncRepository } from "@tsu-stack/db";

import { syncGmailInbox } from "#@/lib/gmail/sync-gmail-inbox";

/**
 * Pub/Sub push body (base64 data) contains Gmail notification JSON:
 * { emailAddress, historyId }
 * We map email → user via user_gmail_sync.emailAddress and run History sync.
 */
export async function handleGmailPushNotification(rawBody: string): Promise<{
  handled: number;
  errors: string[];
}> {
  let emailAddress: string | null = null;
  try {
    const envelope = JSON.parse(rawBody) as {
      message?: { data?: string };
    };
    const dataB64 = envelope.message?.data;
    if (!dataB64) return { handled: 0, errors: ["missing_message_data"] };
    const decoded = Buffer.from(dataB64, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as { emailAddress?: string; historyId?: string };
    emailAddress = payload.emailAddress?.trim().toLowerCase() ?? null;
  } catch {
    return { handled: 0, errors: ["invalid_pubsub_body"] };
  }

  if (!emailAddress) return { handled: 0, errors: ["missing_email"] };

  // Find users with this mailbox address (usually one).
  const all = await userGmailSyncRepository.listByEmailAddress(emailAddress);
  if (all.length === 0) {
    return { handled: 0, errors: [`no_user_for_${emailAddress}`] };
  }

  const errors: string[] = [];
  let handled = 0;
  for (const row of all) {
    const result = await syncGmailInbox(row.userId);
    if (result.ok) handled += 1;
    else errors.push(`${row.userId}:${result.code}`);
  }
  return { handled, errors };
}
