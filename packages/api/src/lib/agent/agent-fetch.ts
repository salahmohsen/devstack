import { timingSafeEqual } from "node:crypto";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { withAgentFetchRetry } from "#@/lib/agent/agent-fetch-retry";

/** Header value sent to the agent worker for Better Auth session authentication. */
export const AGENT_AUTH_HEADER = "Authorization";

/**
 * Timing-safe string equality (UTF-8). Length mismatch → false.
 * Used by shared-secret checks that import this helper.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Auth headers for server → agent: Better Auth session as Bearer.
 * MastraAuthBetterAuth verifies via getSession (cookie or signed Bearer token).
 */
export function agentAuthHeaders(sessionToken?: string | null): Record<string, string> {
  const token = sessionToken?.trim();
  if (!token) return {};
  return { [AGENT_AUTH_HEADER]: `Bearer ${token}` };
}

export type AgentFetchInit = RequestInit & {
  timeoutMs?: number;
  /** Better Auth session token (raw or signed cookie value). */
  sessionToken?: string | null;
  /**
   * Retry network failures and 502/503/504 (deploy/overload).
   * Default false — set true for create-run and other idempotent POSTs.
   */
  retry?: boolean | { attempts?: number; baseDelayMs?: number; maxDelayMs?: number };
};

/**
 * `fetch` against AGENT_WORKER_URL with session Bearer when provided.
 * Returns null when AGENT_WORKER_URL is unset.
 */
export async function agentFetch(path: string, init?: AgentFetchInit): Promise<Response | null> {
  const baseUrl = ENV_SERVER.AGENT_WORKER_URL?.trim();
  if (!baseUrl) return null;

  const { timeoutMs = 45_000, headers: initHeaders, sessionToken, retry, ...rest } = init ?? {};

  const runOnce = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Combine caller abort with timeout
    const onCallerAbort = () => controller.abort();
    rest.signal?.addEventListener("abort", onCallerAbort, { once: true });
    if (rest.signal?.aborted) {
      clearTimeout(timer);
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const headers = new Headers(initHeaders);
      for (const [k, v] of Object.entries(agentAuthHeaders(sessionToken))) {
        if (!headers.has(k)) headers.set(k, v);
      }
      if (!headers.has("Content-Type") && rest.body) {
        headers.set("Content-Type", "application/json");
      }

      return await fetch(new URL(path, baseUrl), {
        ...rest,
        headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
      rest.signal?.removeEventListener("abort", onCallerAbort);
    }
  };

  if (!retry) {
    return runOnce();
  }

  const retryOpts = typeof retry === "object" ? retry : {};
  return withAgentFetchRetry(runOnce, {
    ...retryOpts,
    signal: rest.signal ?? undefined
  });
}
