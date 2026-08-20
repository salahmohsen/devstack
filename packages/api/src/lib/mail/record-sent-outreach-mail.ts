import { mailMessageRepository } from "@tsu-stack/db";

export type RecordedOutreachAttachment = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string | null;
};

/**
 * File a sent apply email into Career Inbox → Applications.
 * Labels `application` so the hub category matches; link `applicationId` for job-info mail.
 */
export async function recordSentOutreachMail(input: {
  userId: string;
  applicationId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  providerMessageId: string | null;
  attachments: RecordedOutreachAttachment[];
}): Promise<void> {
  const preview = input.bodyText.replace(/\s+/g, " ").trim().slice(0, 180);
  const now = new Date();
  const message = await mailMessageRepository.create({
    userId: input.userId,
    provider: "resend",
    providerMessageId: input.providerMessageId,
    fromName: "",
    fromEmail: input.fromEmail,
    toEmail: input.toEmail,
    subject: input.subject,
    preview,
    summary: `Sent application to ${input.toEmail}`,
    bodyText: input.bodyText,
    bodyHtml: null,
    receivedAt: now,
    unread: false,
    purpose: "career",
    labels: ["application"],
    applicationId: input.applicationId,
    classifiedAt: now
  });

  for (const attachment of input.attachments) {
    await mailMessageRepository.createAttachment({
      messageId: message.id,
      userId: input.userId,
      filename: attachment.filename,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      storageKey: attachment.storageKey
    });
  }
}
