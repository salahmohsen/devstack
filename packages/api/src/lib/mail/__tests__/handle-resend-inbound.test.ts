import { beforeEach, describe, expect, it, vi } from "vitest";

const { findSettings, findMessage, createMessage, fetchContent } = vi.hoisted(() => {
  return {
    findSettings: vi.fn(),
    findMessage: vi.fn(),
    createMessage: vi.fn(),
    fetchContent: vi.fn()
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    userMailSettingsRepository: { findByWebhookToken: findSettings },
    mailMessageRepository: { findByProviderMessage: findMessage, create: createMessage }
  };
});
vi.mock("@tsu-stack/env/server/env", () => {
  return { ENV_SERVER: {} };
});
vi.mock("#@/lib/settings/seal-secret", () => {
  return { openSecret: (value: string) => value };
});
vi.mock("#@/lib/mail/fetch-received-email", () => {
  return { fetchReceivedEmailContent: fetchContent };
});
vi.mock("#@/lib/mail/verify-resend-webhook", () => {
  return {
    verifyResendWebhookSignature: () => true
  };
});

import { handleResendInboundWebhook } from "#@/lib/mail/handle-resend-inbound";

const input = {
  webhookToken: "tenant-webhook-token",
  rawBody: JSON.stringify({
    type: "email.received",
    data: {
      email_id: "received-id",
      from: "recruiter@example.com",
      to: ["career@example.com"],
      subject: "Interview"
    }
  }),
  svixId: "delivery-id",
  svixTimestamp: "1234567890",
  svixSignature: "signature"
};

describe("Resend inbound content recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findSettings.mockResolvedValue({
      userId: "tenant-a",
      inboundEnabled: true,
      inboundAddress: "career@example.com",
      resendApiKeyCiphertext: "tenant-api-key",
      webhookSecretCiphertext: "tenant-webhook-secret"
    });
    findMessage.mockResolvedValue(null);
    createMessage.mockImplementation(async (row) => row);
  });

  it("does not persist failed content fetches and accepts a later retry with the body", async () => {
    fetchContent
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ text: "Interview details", html: null });

    const failed = await handleResendInboundWebhook(input);
    expect(failed.status).toBe(503);
    expect(createMessage).not.toHaveBeenCalled();

    const retried = await handleResendInboundWebhook(input);
    expect(retried.status).toBe(200);
    expect(createMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        userId: "tenant-a",
        providerMessageId: "received-id",
        bodyText: "Interview details"
      })
    );
  });

  it("accepts an email whose fetched content is legitimately empty", async () => {
    fetchContent.mockResolvedValue({ text: null, html: null });
    const result = await handleResendInboundWebhook(input);
    expect(result.status).toBe(200);
    expect(createMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ bodyText: "" })
    );
  });
});
