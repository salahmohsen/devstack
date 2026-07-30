import { randomUUID } from "node:crypto";

import { userGmailSyncRepository } from "@tsu-stack/db";

import { getGoogleAccessTokenForUser } from "#@/lib/gmail/google-access-token";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type StartGmailWatchResult =
  | { ok: true; historyId: string | null; expiration: string | null }
  | { ok: false; code: string; message: string };

/**
 * Register Gmail users.watch → Cloud Pub/Sub (push).
 * Requires GMAIL_PUBSUB_TOPIC = projects/{project}/topics/{topic}
 * and a push subscription hitting POST /webhooks/gmail-push.
 */
export async function startGmailWatch(userId: string): Promise<StartGmailWatchResult> {
  const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  if (!topic) {
    return {
      ok: false,
      code: "TOPIC_UNSET",
      message: "Set GMAIL_PUBSUB_TOPIC to enable push watch."
    };
  }

  const token = await getGoogleAccessTokenForUser(userId);
  if (!token.ok) {
    return { ok: false, code: token.code, message: token.message };
  }

  const res = await fetch(`${GMAIL_API}/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topicName: topic,
      labelIds: ["INBOX"],
      labelFilterBehavior: "include"
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      code: "WATCH_FAILED",
      message: `Gmail watch failed (${res.status}): ${body.slice(0, 200)}`
    };
  }

  const json = (await res.json()) as { historyId?: string; expiration?: string };
  const historyId = json.historyId != null ? String(json.historyId) : null;

  let emailAddress: string | null = null;
  const profile = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token.accessToken}` }
  });
  if (profile.ok) {
    const p = (await profile.json()) as { emailAddress?: string };
    emailAddress = p.emailAddress?.trim().toLowerCase() ?? null;
  }

  await userGmailSyncRepository.upsert({
    id: randomUUID(),
    userId,
    historyId: historyId ?? undefined,
    emailAddress: emailAddress ?? undefined,
    lastError: null
  });

  return {
    ok: true,
    historyId,
    expiration: json.expiration != null ? String(json.expiration) : null
  };
}
