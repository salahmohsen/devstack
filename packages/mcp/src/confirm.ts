import { createHmac, timingSafeEqual } from "node:crypto";

export const CONFIRM_TTL_MS = 5 * 60_000;

type Parts = { secret: string; userId: string; tool: string; input: unknown };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function mac({ secret, userId, tool, input }: Parts, expiresAt: number): string {
  return createHmac("sha256", `mcp-confirm:${secret}`)
    .update(`${userId}\n${tool}\n${expiresAt}\n${canonical(input)}`)
    .digest("hex");
}

export function signConfirm(parts: Parts & { now?: number }): string {
  const expiresAt = (parts.now ?? Date.now()) + CONFIRM_TTL_MS;
  return `${expiresAt}.${mac(parts, expiresAt)}`;
}

export function verifyConfirm(
  parts: Parts & { token: string; now?: number }
): "ok" | "invalid" | "expired" {
  const [expiresRaw, given] = parts.token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!given || !Number.isFinite(expiresAt)) return "invalid";

  const expected = Buffer.from(mac(parts, expiresAt));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "invalid";

  return (parts.now ?? Date.now()) > expiresAt ? "expired" : "ok";
}
