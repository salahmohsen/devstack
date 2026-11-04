import { createDb, runWithDb, userMailSettingsRepository } from "@tsu-stack/db";

import { openSecret } from "#@/mastra/lib/open-secret";

export type SendCareerReplyAttachment = {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
};

export type SendCareerReplyInput = {
  userId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  attachments?: SendCareerReplyAttachment[];
};

export type SendCareerReplyOk = {
  ok: true;
  providerMessageId: string | null;
  from: string;
};

export type SendCareerReplyErr = {
  ok: false;
  code: "MISSING_API_KEY" | "MISSING_FROM" | "INVALID_TO" | "RESEND_ERROR";
  message: string;
};

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed;
}

function toBase64Content(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Send Career Inbox / outreach mail via Resend (agent-local parity with API).
 */
export async function sendCareerReply(
  input: SendCareerReplyInput
): Promise<SendCareerReplyOk | SendCareerReplyErr> {
  const to = nonEmpty(input.to);
  if (!to || !to.includes("@")) {
    return { ok: false, code: "INVALID_TO", message: "Reply has no valid recipient address." };
  }

  const db = createDb();
  const settings = await runWithDb(db, () => userMailSettingsRepository.findByUserId(input.userId));
  const apiKey = nonEmpty(openSecret(settings?.resendApiKeyCiphertext));
  if (!apiKey) {
    return {
      ok: false,
      code: "MISSING_API_KEY",
      message: "Add a Resend API key under Settings → Integrations before sending."
    };
  }

  const from = nonEmpty(settings?.inboundAddress);
  if (!from) {
    return {
      ok: false,
      code: "MISSING_FROM",
      message: "Set your inbound/career From address under Settings → Integrations."
    };
  }

  const subject = nonEmpty(input.subject) ?? "(no subject)";
  const text = input.bodyText.trim();
  const htmlBody = nonEmpty(input.bodyHtml);
  const html =
    htmlBody ??
    text
      .split("\n")
      .map((line) => `<p>${escapeHtml(line.length > 0 ? line : " ")}</p>`)
      .join("");

  const attachments =
    input.attachments && input.attachments.length > 0
      ? input.attachments.map((a) => {
          return {
            filename: a.filename,
            content: toBase64Content(a.content),
            ...(a.contentType ? { content_type: a.contentType } : {})
          };
        })
      : undefined;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      ...(attachments ? { attachments } : {})
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    return {
      ok: false,
      code: "RESEND_ERROR",
      message: `Resend rejected the send (${response.status}): ${errBody.slice(0, 280) || response.statusText}`
    };
  }

  const json = (await response.json().catch(() => null)) as { id?: string } | null;
  return {
    ok: true,
    providerMessageId: json?.id ?? null,
    from
  };
}
