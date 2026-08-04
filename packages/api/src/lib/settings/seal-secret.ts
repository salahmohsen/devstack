import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

const SALT = "tsu-ai-provider-key-v1";
const PREFIX = "v1:";

/** Memoize scrypt key derivation — seal/open run on every LLM resolve. */
let cachedKey: Buffer | null = null;
function deriveKey(): Buffer {
  if (cachedKey) return cachedKey;
  cachedKey = scryptSync(ENV_SERVER.BETTER_AUTH_SECRET, SALT, 32);
  return cachedKey;
}

/** Seal API key for storage. Returns base64 payload with version prefix. */
export function sealSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, encrypted]);
  return `${PREFIX}${packed.toString("base64")}`;
}

/** Open sealed secret; returns null if corrupt or empty. */
export function openSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ciphertext.startsWith(PREFIX)) return null;
  try {
    const packed = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const data = packed.subarray(28);
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
