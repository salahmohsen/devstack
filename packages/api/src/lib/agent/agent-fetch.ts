import { timingSafeEqual } from "node:crypto";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

/** Header value sent to the agent worker for service authentication. */
export const AGENT_AUTH_HEADER = "Authorization";

/**
 * Timing-safe string equality (UTF-8). Length mismatch → false.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Auth headers for server → agent calls.
 * Empty when AGENT_SERVICE_SECRET is unset (dev-only; production should set it).
 */
export function agentAuthHeaders(): Record<string, string> {
  const secret = ENV_SERVER.AGENT_SERVICE_SECRET?.trim();
  if (!secret) return {};
  return { [AGENT_AUTH_HEADER]: `Bearer ${secret}` };
}

/**
 * `fetch` against AGENT_WORKER_URL with service auth headers merged in.
 * Returns null when AGENT_WORKER_URL is unset.
 */
export async function agentFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response | null> {
  const baseUrl = ENV_SERVER.AGENT_WORKER_URL?.trim();
  if (!baseUrl) return null;

  const { timeoutMs = 45_000, headers: initHeaders, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(initHeaders);
    for (const [k, v] of Object.entries(agentAuthHeaders())) {
      if (!headers.has(k)) headers.set(k, v);
    }
    if (!headers.has("Content-Type") && rest.body) {
      headers.set("Content-Type", "application/json");
    }

    return await fetch(new URL(path, baseUrl), {
      ...rest,
      headers,
      signal: rest.signal ?? controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}
