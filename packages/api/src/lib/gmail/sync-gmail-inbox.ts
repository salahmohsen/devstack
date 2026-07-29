import { randomUUID } from "node:crypto";

import { type GmailSyncResult, scopeListIncludesGmail } from "@tsu-stack/core";
import {
  betterAuthAccountRepository,
  mailMessageRepository,
  userGmailSyncRepository
} from "@tsu-stack/db";

import { getGoogleAccessTokenForUser } from "#@/lib/gmail/google-access-token";
import { parseGmailMessage, type GmailMessageResource } from "#@/lib/gmail/parse-gmail-message";
import { requestMailClassify } from "#@/lib/mail/classify-enqueue-hook";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
/** First sync / fallback: recent inbox only. */
const INITIAL_MAX = 25;
const HISTORY_MAX = 50;

export type SyncGmailInboxResult =
  | { ok: true; result: GmailSyncResult }
  | { ok: false; code: string; message: string };

async function gmailGet<T>(
  accessToken: string,
  path: string
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body };
  }
  return { ok: true, data: (await res.json()) as T };
}

/**
 * Import Gmail inbox messages into Career Inbox (provider=gmail).
 * - First run: list recent inbox messages
 * - Later: History API deltas when historyId is stored
 */
export async function syncGmailInbox(userId: string): Promise<SyncGmailInboxResult> {
  const token = await getGoogleAccessTokenForUser(userId);
  if (!token.ok) {
    return { ok: false, code: token.code, message: token.message };
  }

  const accessToken = token.accessToken;
  const profile = await gmailGet<{
    emailAddress?: string;
    historyId?: string;
  }>(accessToken, "/profile");

  if (!profile.ok) {
    await userGmailSyncRepository.upsert({
      id: randomUUID(),
      userId,
      lastError: `profile ${profile.status}: ${profile.body.slice(0, 200)}`
    });
    return {
      ok: false,
      code: "GMAIL_API_ERROR",
      message: `Gmail profile failed (${profile.status}).`
    };
  }

  const emailAddress = profile.data.emailAddress?.trim() ?? null;
  const profileHistoryId = profile.data.historyId != null ? String(profile.data.historyId) : null;

  const cursor = await userGmailSyncRepository.findByUserId(userId);
  const messageIdsToFetch = new Set<string>();

  if (cursor?.historyId) {
    const history = await gmailGet<{
      history?: Array<{
        messagesAdded?: Array<{ message?: { id?: string } }>;
      }>;
      historyId?: string;
    }>(
      accessToken,
      `/history?startHistoryId=${encodeURIComponent(cursor.historyId)}&historyTypes=messageAdded&maxResults=${HISTORY_MAX}`
    );

    if (history.ok) {
      for (const h of history.data.history ?? []) {
        for (const added of h.messagesAdded ?? []) {
          const id = added.message?.id;
          if (id) messageIdsToFetch.add(id);
        }
      }
    } else if (history.status === 404) {
      // historyId too old — fall through to list
    } else {
      await userGmailSyncRepository.upsert({
        id: cursor.id,
        userId,
        lastError: `history ${history.status}: ${history.body.slice(0, 200)}`
      });
      return {
        ok: false,
        code: "GMAIL_API_ERROR",
        message: `Gmail history failed (${history.status}).`
      };
    }
  }

  if (messageIdsToFetch.size === 0) {
    const list = await gmailGet<{
      messages?: Array<{ id?: string }>;
    }>(accessToken, `/messages?maxResults=${INITIAL_MAX}&q=${encodeURIComponent("in:inbox")}`);
    if (!list.ok) {
      await userGmailSyncRepository.upsert({
        id: cursor?.id ?? randomUUID(),
        userId,
        lastError: `list ${list.status}: ${list.body.slice(0, 200)}`
      });
      return {
        ok: false,
        code: "GMAIL_API_ERROR",
        message: `Gmail list failed (${list.status}).`
      };
    }
    for (const m of list.data.messages ?? []) {
      if (m.id) messageIdsToFetch.add(m.id);
    }
  }

  let imported = 0;
  let skipped = 0;
  const createdIds: string[] = [];

  for (const gmailId of messageIdsToFetch) {
    const existing = await mailMessageRepository.findByProviderMessage(userId, "gmail", gmailId);
    if (existing) {
      skipped += 1;
      continue;
    }

    const full = await gmailGet<GmailMessageResource>(
      accessToken,
      `/messages/${encodeURIComponent(gmailId)}?format=full`
    );
    if (!full.ok) {
      skipped += 1;
      continue;
    }

    const parsed = parseGmailMessage(full.data);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    const message = await mailMessageRepository.create({
      id: randomUUID(),
      userId,
      provider: "gmail",
      providerMessageId: parsed.providerMessageId,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      toEmail: parsed.toEmail ?? emailAddress,
      subject: parsed.subject,
      preview: parsed.preview,
      bodyText: parsed.bodyText,
      bodyHtml: parsed.bodyHtml,
      receivedAt: parsed.receivedAt,
      unread: true,
      purpose: "career",
      labels: [],
      applicationId: null,
      classifiedAt: null
    });

    imported += 1;
    createdIds.push(message.id);
    await requestMailClassify({ messageId: message.id, userId });
  }

  const googleAccount = await betterAuthAccountRepository.findGoogleAccountForUser(userId);
  const stillGmail = scopeListIncludesGmail(googleAccount?.scope);

  await userGmailSyncRepository.upsert({
    id: cursor?.id ?? randomUUID(),
    userId,
    historyId: profileHistoryId,
    emailAddress,
    lastSyncedAt: new Date(),
    lastError: stillGmail ? null : "Gmail scopes missing after sync"
  });

  return {
    ok: true,
    result: {
      imported,
      skipped,
      historyId: profileHistoryId,
      emailAddress,
      messageIds: createdIds
    }
  };
}
