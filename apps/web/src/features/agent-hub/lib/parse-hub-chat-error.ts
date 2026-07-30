/**
 * Turns raw hub/agent transport errors into calm, actionable UI copy.
 * Keeps stack traces and file paths out of the primary message.
 */

export type HubChatErrorKind =
  | "insufficient_balance"
  | "missing_byo"
  | "unauthorized"
  | "unavailable"
  | "unknown";

export type HubChatErrorPresentation = {
  kind: HubChatErrorKind;
  /** Alert tone */
  variant: "error" | "warning";
  title: string;
  description: string;
  /** External recovery URL when the provider embeds one (e.g. billing). */
  billingUrl: string | null;
  /** Deep-link to app Settings → AI when the fix lives in BYO settings. */
  showAiSettings: boolean;
  /** Whether Retry is a sensible primary recovery. */
  retryable: boolean;
  /** Full original message for optional technical details. */
  technicalDetails: string | null;
};

const BILLING_URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

function extractHttpUrls(text: string): string[] {
  const matches = text.match(BILLING_URL_RE) ?? [];
  return matches.map((u) => u.replace(/[),.;]+$/g, ""));
}

function tryParseJsonMessage(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  // Common wrappers: Hub agent error (500): {...}
  const brace = trimmed.indexOf("{");
  if (brace < 0) return null;
  const candidate = trimmed.slice(brace);
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Nested stringified error objects occasionally appear mid-string.
    try {
      const inner = candidate.match(/\{[\s\S]*\}/)?.[0];
      if (inner) {
        const parsed = JSON.parse(inner) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

function collectText(raw: string, json: Record<string, unknown> | null): string {
  const parts: string[] = [raw];
  if (json) {
    for (const key of ["message", "error", "name", "code", "why"] as const) {
      const v = json[key];
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join("\n");
}

function preferBillingUrl(urls: string[]): string | null {
  const billing = urls.find((u) => /billing|checkout|portal|stripe|credits?/i.test(u));
  return billing ?? urls[0] ?? null;
}

/**
 * Map a transport/AI SDK error message into presentation fields.
 */
export function parseHubChatError(raw: string | null | undefined): HubChatErrorPresentation {
  const technical = raw?.trim() ? raw.trim() : null;
  if (!technical) {
    return {
      kind: "unknown",
      variant: "error",
      title: "Message not sent",
      description: "Something went wrong. Try again in a moment.",
      billingUrl: null,
      showAiSettings: false,
      retryable: true,
      technicalDetails: null
    };
  }

  const json = tryParseJsonMessage(technical);
  const haystack = collectText(technical, json).toLowerCase();
  const urls = extractHttpUrls(technical);

  // Provider out of credits / balance (OpenCode, OpenAI-compatible, etc.)
  if (
    /insufficient\s+balance|insufficient\s+credits|credits?\s+error|out of credits|payment required|402\b/i.test(
      haystack
    ) ||
    (json?.name === "AI_APICallError" && /balance|credit|billing/i.test(haystack))
  ) {
    return {
      kind: "insufficient_balance",
      variant: "warning",
      title: "Provider balance is empty",
      description:
        "Your AI provider rejected the request because the account has no remaining balance. Add credits with the provider, or switch model and key in AI settings.",
      billingUrl: preferBillingUrl(urls),
      showAiSettings: true,
      retryable: true,
      technicalDetails: technical
    };
  }

  if (
    /configure an ai provider|byo|missing_byo|api key|no api key|llm:missing_byo/i.test(haystack)
  ) {
    return {
      kind: "missing_byo",
      variant: "warning",
      title: "AI provider not configured",
      description: "Add a provider API key and model in Settings → AI before using Hub chat.",
      billingUrl: null,
      showAiSettings: true,
      retryable: false,
      technicalDetails: technical
    };
  }

  if (/unauthorized|401\b|session|not authenticated|forbidden|403\b/i.test(haystack)) {
    return {
      kind: "unauthorized",
      variant: "error",
      title: "Session expired",
      description: "Sign in again, then retry your message.",
      billingUrl: null,
      showAiSettings: false,
      retryable: true,
      technicalDetails: technical
    };
  }

  if (
    /threadid.*undefined|resourceid and a threadid|memory|hub is unavailable|agent returned 5|internal server error|econnrefused|fetch failed|network/i.test(
      haystack
    )
  ) {
    return {
      kind: "unavailable",
      variant: "error",
      title: "Hub is unavailable",
      description: "The assistant could not complete this request. Try again in a moment.",
      billingUrl: null,
      showAiSettings: false,
      retryable: true,
      technicalDetails: technical
    };
  }

  // Prefer a short human string from JSON when present; never dump stacks.
  let description = "Unable to complete the request. Try again in a moment.";
  if (typeof json?.message === "string" && json.message.length > 0 && json.message.length < 200) {
    // Strip stack-looking multi-line content
    const firstLine = json.message.split("\n")[0]?.trim() ?? "";
    if (firstLine && !/^\s*at\s+/.test(firstLine) && !firstLine.includes("file:///")) {
      description = firstLine;
    }
  } else if (
    technical.length < 160 &&
    !technical.includes("\n") &&
    !technical.includes("file:///")
  ) {
    description = technical;
  }

  return {
    kind: "unknown",
    variant: "error",
    title: "Message not sent",
    description,
    billingUrl: null,
    showAiSettings: false,
    retryable: true,
    technicalDetails: technical
  };
}
