import { randomUUID } from "node:crypto";

import {
  mailPreviewFromBody,
  parseEmailAddress,
  RESEND_EMAIL_RECEIVED_EVENT
} from "@tsu-stack/core";
import { mailMessageRepository, userMailSettingsRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { openSecret } from "#@/lib/settings/seal-secret";

import { fetchReceivedEmailContent } from "./fetch-received-email";
import { verifyResendWebhookSignature } from "./verify-resend-webhook";

export type HandleResendInboundResult = {
  status: 200 | 202 | 400 | 401 | 404 | 503;
  reason: string;
  messageId?: string;
  userId?: string;
  duplicate?: boolean;
};

type ResendInboundAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  content_disposition?: string;
  content_id?: string;
};

type ResendEmailReceivedPayload = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
    message_id?: string;
    subject?: string;
    attachments?: ResendInboundAttachment[];
  };
};

/**
 * Multi-tenant BYO Resend inbound:
 * 1. Resolve tenant by opaque webhookToken (path).
 * 2. Verify Svix signature with that user's sealed webhook secret.
 * 3. Fetch body with that user's sealed API key.
 * 4. Idempotent insert on (userId, provider=resend, providerMessageId).
 */
export async function handleResendInboundWebhook(input: {
  webhookToken: string;
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}): Promise<HandleResendInboundResult> {
  const settings = await userMailSettingsRepository.findByWebhookToken(input.webhookToken);
  if (!settings) {
    return { status: 404, reason: "unknown_webhook_token" };
  }

  if (!settings.inboundEnabled) {
    return { status: 503, reason: "inbound_disabled" };
  }

  const webhookSecret = openSecret(settings.webhookSecretCiphertext);
  if (!webhookSecret) {
    return { status: 503, reason: "webhook_secret_missing" };
  }

  if (!input.svixId || !input.svixTimestamp || !input.svixSignature) {
    return { status: 400, reason: "missing_svix_headers" };
  }

  const valid = verifyResendWebhookSignature({
    rawBody: input.rawBody,
    svixId: input.svixId,
    svixTimestamp: input.svixTimestamp,
    svixSignature: input.svixSignature,
    webhookSecret
  });
  if (!valid) {
    return { status: 401, reason: "invalid_signature" };
  }

  let payload: ResendEmailReceivedPayload;
  try {
    payload = JSON.parse(input.rawBody) as ResendEmailReceivedPayload;
  } catch {
    return { status: 400, reason: "invalid_json" };
  }

  if (payload.type !== RESEND_EMAIL_RECEIVED_EVENT) {
    return { status: 202, reason: "ignored_event_type" };
  }

  const data = payload.data;
  const emailId = data?.email_id?.trim();
  if (!emailId) {
    return { status: 400, reason: "missing_email_id" };
  }

  const providerMessageId = emailId;
  const existing = await mailMessageRepository.findByProviderMessage(
    settings.userId,
    "resend",
    providerMessageId
  );
  if (existing) {
    return {
      status: 200,
      reason: "duplicate",
      messageId: existing.id,
      userId: settings.userId,
      duplicate: true
    };
  }

  if (settings.inboundAddress) {
    const recipients = [
      ...(data?.to ?? []),
      ...(data?.cc ?? []),
      ...(data?.received_for ?? [])
    ].map((r) => parseEmailAddress(r).email);
    if (!recipients.includes(settings.inboundAddress.toLowerCase())) {
      // Soft reject: wrong mailbox for this tenant webhook.
      return { status: 202, reason: "recipient_mismatch" };
    }
  }

  const fromRaw = data?.from ?? "";
  const from = parseEmailAddress(fromRaw);
  if (!from.email) {
    return { status: 400, reason: "missing_from" };
  }

  const purpose = isProductNotificationFrom(from.email) ? "system_notification" : "career";

  let bodyText = "";
  let bodyHtml: string | null = null;

  const apiKey = openSecret(settings.resendApiKeyCiphertext);
  if (apiKey) {
    const content = await fetchReceivedEmailContent({ apiKey, emailId });
    if (content) {
      bodyText = content.text?.trim() ?? "";
      bodyHtml = content.html ?? null;
      if (!bodyText && bodyHtml) {
        bodyText = stripHtml(bodyHtml);
      }
    }
  }

  const subject = data?.subject?.trim() ?? "";
  const bodyPreview = mailPreviewFromBody(bodyText);
  const subjectPreview = mailPreviewFromBody(subject);
  const preview =
    bodyPreview.length > 0
      ? bodyPreview
      : subjectPreview.length > 0
        ? subjectPreview
        : "(no preview)";

  const toEmail =
    data?.to?.[0] != null ? parseEmailAddress(data.to[0]).email : (settings.inboundAddress ?? null);

  const receivedAt = data?.created_at ? new Date(data.created_at) : new Date();

  const message = await mailMessageRepository.create({
    id: randomUUID(),
    userId: settings.userId,
    provider: "resend",
    providerMessageId,
    fromName: from.name,
    fromEmail: from.email,
    toEmail,
    subject,
    preview,
    bodyText,
    bodyHtml,
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
    unread: true,
    purpose,
    labels: [],
    applicationId: null,
    classifiedAt: null
  });

  const attachments = data?.attachments ?? [];
  for (const att of attachments) {
    if (!att.filename && !att.id) continue;
    await mailMessageRepository.createAttachment({
      id: randomUUID(),
      messageId: message.id,
      userId: settings.userId,
      filename: att.filename?.trim() ?? att.id ?? "attachment",
      contentType: att.content_type ?? null,
      sizeBytes: null,
      storageKey: null
    });
  }

  return {
    status: 200,
    reason: "persisted",
    messageId: message.id,
    userId: settings.userId,
    duplicate: false
  };
}

function isProductNotificationFrom(fromEmail: string): boolean {
  const productFrom = ENV_SERVER.EMAIL_FROM?.trim();
  if (!productFrom) return false;
  return parseEmailAddress(productFrom).email === fromEmail.toLowerCase();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
