import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Resend/Svix webhook signature against the raw body.
 * Secret is the signing secret from the Resend webhook UI (`whsec_…`).
 *
 * @see https://resend.com/docs/webhooks/verify-webhooks-requests
 */
export function verifyResendWebhookSignature(input: {
  rawBody: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  webhookSecret: string;
}): boolean {
  const secretBytes = decodeSvixSecret(input.webhookSecret);
  if (!secretBytes) return false;

  const signedContent = `${input.svixId}.${input.svixTimestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest();

  const signatures = input.svixSignature.split(" ");
  for (const part of signatures) {
    const [version, sigB64] = part.split(",");
    if (version !== "v1" || !sigB64) continue;
    try {
      const provided = Buffer.from(sigB64, "base64");
      if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
        return true;
      }
    } catch {
      // ignore malformed segment
    }
  }
  return false;
}

function decodeSvixSecret(secret: string): Buffer | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  const raw = trimmed.startsWith("whsec_") ? trimmed.slice("whsec_".length) : trimmed;
  try {
    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}
