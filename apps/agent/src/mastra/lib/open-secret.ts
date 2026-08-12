import { createDecipheriv, scryptSync } from "node:crypto";

/**
 * Open Settings AI key ciphertext sealed by packages/api `seal-secret`.
 * Same algorithm (scrypt + AES-GCM, BETTER_AUTH_SECRET) so agent can resolve
 * BYO keys without importing `@tsu-stack/api` (Mastra cannot bundle that graph).
 */
const SALT = "tsu-ai-provider-key-v1";
const PREFIX = "v1:";

let cachedKey: Buffer | null = null;

function deriveKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  cachedKey = scryptSync(secret, SALT, 32);
  return cachedKey;
}

/** Open sealed secret; returns null if corrupt, empty, or secret unset. */
export function openSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ciphertext.startsWith(PREFIX)) return null;
  const key = deriveKey();
  if (!key) return null;
  try {
    const packed = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const data = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
