import { randomUUID } from "node:crypto";

import {
  buildResendWebhookUrl,
  MailSettingsOutputSchema,
  maskSecretLast4,
  UpdateMailSettingsInputSchema
} from "@tsu-stack/core";
import { userMailSettingsRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { sealSecret } from "#@/lib/settings/seal-secret";

function webhookUrlFor(token: string): string {
  return buildResendWebhookUrl(ENV_SERVER.VITE_SERVER_URL, token);
}

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof userMailSettingsRepository.findByUserId>>>
) {
  // Normalize DB nullables so client form always gets stable booleans / null emails.
  const inboundRaw = row.inboundAddress?.trim() ?? "";
  const inboundAddress =
    inboundRaw.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inboundRaw)
      ? inboundRaw.toLowerCase()
      : null;

  const apiKeyLast4 = row.resendApiKeyLast4?.trim() ?? "";
  const webhookLast4 = row.webhookSecretLast4?.trim() ?? "";

  return MailSettingsOutputSchema.parse({
    inboundEnabled: Boolean(row.inboundEnabled),
    inboundAddress,
    hasResendApiKey: Boolean(row.resendApiKeyCiphertext),
    resendApiKeyLast4: apiKeyLast4.length > 0 ? apiKeyLast4 : null,
    hasWebhookSecret: Boolean(row.webhookSecretCiphertext),
    webhookSecretLast4: webhookLast4.length > 0 ? webhookLast4 : null,
    webhookToken: row.webhookToken,
    webhookUrl: webhookUrlFor(row.webhookToken),
    updatedAt: row.updatedAt ?? null
  });
}

function freshToken(): string {
  return randomUUID().replaceAll("-", "");
}

export const mailSettingsRouter = {
  get: protectedProcedure
    .route({
      description: "Get BYO Resend / Career Inbox mail settings (secrets masked)",
      method: "GET"
    })
    .output(MailSettingsOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      let row = await userMailSettingsRepository.findByUserId(userId);
      // Provision empty row so webhook URL token is stable before first save.
      row ??= await userMailSettingsRepository.upsert({
        id: randomUUID(),
        userId,
        inboundEnabled: false,
        inboundAddress: null,
        resendApiKeyLast4: null,
        resendApiKeyCiphertext: null,
        webhookSecretLast4: null,
        webhookSecretCiphertext: null,
        webhookToken: freshToken()
      });
      return toOutput(row);
    }),

  update: protectedProcedure
    .route({
      description: "Update BYO Resend API key, webhook secret, and inbound address",
      method: "POST"
    })
    .input(UpdateMailSettingsInputSchema)
    .output(MailSettingsOutputSchema)
    .errors({
      INBOUND_ADDRESS_INVALID: {
        message: "Enter a valid inbound email address.",
        status: 400
      },
      SECRETS_REQUIRED_FOR_ENABLE: {
        message: "Enable inbound only after saving a Resend API key and webhook signing secret.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const existing = await userMailSettingsRepository.findByUserId(userId);

      let inboundAddress: string | null = existing?.inboundAddress ?? null;
      if (input.inboundAddress !== undefined) {
        const raw = input.inboundAddress?.trim() ?? "";
        if (raw === "") {
          inboundAddress = null;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) || raw.length > 320) {
          throw errors.INBOUND_ADDRESS_INVALID();
        } else {
          inboundAddress = raw.toLowerCase();
        }
      }

      let resendApiKeyLast4 = existing?.resendApiKeyLast4 ?? null;
      let resendApiKeyCiphertext = existing?.resendApiKeyCiphertext ?? null;
      if (input.clearResendApiKey) {
        resendApiKeyLast4 = null;
        resendApiKeyCiphertext = null;
      } else if (input.resendApiKey?.trim()) {
        const key = input.resendApiKey.trim();
        resendApiKeyLast4 = maskSecretLast4(key);
        resendApiKeyCiphertext = sealSecret(key);
      }

      let webhookSecretLast4 = existing?.webhookSecretLast4 ?? null;
      let webhookSecretCiphertext = existing?.webhookSecretCiphertext ?? null;
      if (input.clearWebhookSecret) {
        webhookSecretLast4 = null;
        webhookSecretCiphertext = null;
      } else if (input.webhookSecret?.trim()) {
        const secret = input.webhookSecret.trim();
        webhookSecretLast4 = maskSecretLast4(secret);
        webhookSecretCiphertext = sealSecret(secret);
      }

      let webhookToken = existing?.webhookToken ?? freshToken();
      if (input.rotateWebhookToken || !existing) {
        if (input.rotateWebhookToken) {
          webhookToken = freshToken();
        }
      }

      const inboundEnabled = input.inboundEnabled ?? existing?.inboundEnabled ?? false;
      if (inboundEnabled && (!resendApiKeyCiphertext || !webhookSecretCiphertext)) {
        throw errors.SECRETS_REQUIRED_FOR_ENABLE();
      }

      const row = await userMailSettingsRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        inboundEnabled,
        inboundAddress,
        resendApiKeyLast4,
        resendApiKeyCiphertext,
        webhookSecretLast4,
        webhookSecretCiphertext,
        webhookToken
      });

      return toOutput(row);
    })
};
