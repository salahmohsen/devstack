/**
 * Turns raw AI / agent transport errors into calm, actionable UI copy.
 *
 * Design rules (better-writing / product UI):
 * - One message: what happened + how to fix (no blame, no "oops")
 * - Kind-specific recovery CTAs (billing, AI settings, retry)
 * - Stacks and soft-fail notes stay in technical details only
 * - Feature context only adjusts the title when the kind is generic
 */

export type AiErrorKind =
  | "insufficient_balance"
  | "missing_byo"
  | "unauthorized"
  | "unavailable"
  | "unknown";

/** Surface that produced the error — only changes generic titles/copy. */
export type AiErrorFeature = "hub" | "organize" | "resume" | "mail" | "generic";

/**
 * hard — the task could not complete (block next step)
 * partial — some work finished; AI steps were skipped or soft-failed
 */
export type AiErrorSeverity = "hard" | "partial";

/** @deprecated Prefer AiErrorKind */
export type HubChatErrorKind = AiErrorKind;

export type AiErrorPresentation = {
  kind: AiErrorKind;
  /** Alert / toast tone */
  variant: "error" | "warning";
  /** Short status — scannable in ~4 words */
  title: string;
  /** Instruction: how to recover */
  description: string;
  /** External recovery URL when the provider embeds one (e.g. billing). */
  billingUrl: string | null;
  /** Deep-link to app Settings → AI when the fix lives in BYO settings. */
  showAiSettings: boolean;
  /** Whether Retry is a sensible recovery. */
  retryable: boolean;
  /** Full original payload for optional technical details (collapsed in UI). */
  technicalDetails: string | null;
};

/** @deprecated Prefer AiErrorPresentation */
export type HubChatErrorPresentation = AiErrorPresentation;

export type PresentAiErrorOptions = {
  feature?: AiErrorFeature;
  severity?: AiErrorSeverity;
  /** Soft-fail notes — folded into technical details, never primary bullets. */
  notes?: string[];
};

const BILLING_URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

function extractHttpUrls(text: string): string[] {
  const matches = text.match(BILLING_URL_RE) ?? [];
  return matches.map((u) => u.replace(/[),.;]+$/g, ""));
}

function tryParseJsonMessage(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const brace = trimmed.indexOf("{");
  if (brace < 0) return null;
  const candidate = trimmed.slice(brace);
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
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

function firstUsefulLine(text: string): string | null {
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  if (!firstLine) return null;
  if (/^\s*at\s+/.test(firstLine) || firstLine.includes("file:///")) return null;
  if (firstLine.length > 200) return firstLine.slice(0, 197) + "…";
  return firstLine;
}

function mergeTechnicalDetails(primary: string | null, notes: string[] | undefined): string | null {
  const parts: string[] = [];
  if (primary?.trim()) parts.push(primary.trim());
  for (const note of notes ?? []) {
    const t = note.trim();
    if (!t) continue;
    if (parts.some((p) => p.includes(t) || t.includes(p))) continue;
    parts.push(t);
  }
  if (parts.length === 0) return null;
  return parts.join("\n\n");
}

function hardUnknownTitle(feature: AiErrorFeature): string {
  switch (feature) {
    case "hub":
      return "Message not sent";
    case "organize":
      return "Organize failed";
    case "resume":
      return "Resume analysis failed";
    case "mail":
      return "Reply draft failed";
    case "generic":
      return "Request failed";
  }
}

function hardUnknownDescription(feature: AiErrorFeature): string {
  switch (feature) {
    case "hub":
      return "Unable to send your message. Try again in a moment.";
    case "organize":
      return "Unable to organize stacks. Try again in a moment.";
    case "resume":
      return "Unable to analyze this resume. Try again in a moment.";
    case "mail":
      return "Unable to generate a reply. Try again in a moment.";
    case "generic":
      return "Unable to complete the request. Try again in a moment.";
  }
}

function partialUnknownTitle(feature: AiErrorFeature): string {
  switch (feature) {
    case "organize":
      return "Suggestions incomplete";
    case "resume":
      return "Analysis incomplete";
    case "mail":
      return "Draft incomplete";
    case "hub":
    case "generic":
      return "AI results incomplete";
  }
}

function partialUnknownDescription(feature: AiErrorFeature): string {
  switch (feature) {
    case "organize":
      return "Some AI steps did not finish. You can apply what is ready below, or fix AI settings and run organize again.";
    case "resume":
      return "Some analysis steps did not finish. Review what is ready, or fix AI settings and try again.";
    case "mail":
      return "The draft may be incomplete. Fix AI settings if needed, then try again.";
    case "hub":
    case "generic":
      return "Some AI steps did not finish. Fix AI settings if needed, then try again.";
  }
}

/**
 * Classify a raw transport/AI SDK message into kind + recovery flags.
 * Prefer {@link presentAiError} when rendering UI so feature/severity apply.
 */
export function parseAiError(raw: string | null | undefined): AiErrorPresentation {
  const technical = raw?.trim() ? raw.trim() : null;
  if (!technical) {
    return {
      kind: "unknown",
      variant: "error",
      title: "Request failed",
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
      title: "Provider out of credits",
      description: "Add credits with your AI provider, or switch model and key in AI settings.",
      billingUrl: preferBillingUrl(urls),
      showAiSettings: true,
      retryable: true,
      technicalDetails: technical
    };
  }

  if (
    /configure an ai provider|settings\s*→\s*ai|byo|missing_byo|api key|no api key|llm:missing_byo|ai organize suggestions were skipped|provider not configured/i.test(
      haystack
    )
  ) {
    return {
      kind: "missing_byo",
      variant: "warning",
      title: "AI provider not set up",
      description: "Add a provider API key and model in AI settings, then try again.",
      billingUrl: null,
      showAiSettings: true,
      retryable: false,
      technicalDetails: technical
    };
  }

  if (/unauthorized|401\b|session expired|not authenticated|forbidden|403\b/i.test(haystack)) {
    return {
      kind: "unauthorized",
      variant: "error",
      title: "Session expired",
      description: "Sign in again, then retry.",
      billingUrl: null,
      showAiSettings: false,
      retryable: true,
      technicalDetails: technical
    };
  }

  if (
    /threadid.*undefined|resourceid and a threadid|memory|hub is unavailable|agent returned 5|internal server error|econnrefused|fetch failed|network|llm timeout|timeout after|upstream request failed|temporarily unavailable \(503\)|agent is unreachable|agent overloaded|create_run_failed|agent:unreachable|agent:create_run/i.test(
      haystack
    )
  ) {
    return {
      kind: "unavailable",
      variant: "error",
      title: "Assistant is offline",
      description: "Try again in a moment.",
      billingUrl: null,
      showAiSettings: false,
      retryable: true,
      technicalDetails: technical
    };
  }

  // Prefer a short human string from JSON when present; never dump stacks.
  let description = "Unable to complete the request. Try again in a moment.";
  if (typeof json?.message === "string" && json.message.length > 0) {
    const line = firstUsefulLine(json.message);
    if (line) description = line;
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
    title: "Request failed",
    description,
    billingUrl: null,
    showAiSettings: false,
    retryable: true,
    technicalDetails: technical
  };
}

/**
 * Map raw errors (+ optional notes / feature) into final UI presentation.
 * Use this for banners and toasts so every AI surface shares one voice.
 */
export function presentAiError(
  raw: string | null | undefined,
  options: PresentAiErrorOptions = {}
): AiErrorPresentation {
  const feature = options.feature ?? "generic";
  const severity = options.severity ?? "hard";
  const notes = options.notes?.filter((n) => n.trim()) ?? [];

  // Prefer raw when present; otherwise join notes so classification still works.
  const trimmed = raw?.trim();
  const source =
    trimmed && trimmed.length > 0 ? trimmed : notes.length > 0 ? notes.join("\n") : null;
  const base = parseAiError(source);

  const technicalDetails = mergeTechnicalDetails(base.technicalDetails, notes);

  // Known kinds keep their recovery copy; only fold technical details.
  if (base.kind !== "unknown") {
    return {
      ...base,
      // Partial success is never a hard "error" tone
      variant: severity === "partial" ? "warning" : base.variant,
      technicalDetails,
      // Partial: allow retry even for missing_byo when user may have fixed settings
      retryable: severity === "partial" ? true : base.retryable
    };
  }

  if (severity === "partial") {
    return {
      kind: "unknown",
      variant: "warning",
      title: partialUnknownTitle(feature),
      description: partialUnknownDescription(feature),
      billingUrl: null,
      showAiSettings: true,
      retryable: true,
      technicalDetails
    };
  }

  // Hard unknown: feature-specific title; keep a useful description when short/clean
  const description =
    base.description &&
    base.description !== "Unable to complete the request. Try again in a moment." &&
    base.description !== "Something went wrong. Try again in a moment."
      ? base.description
      : hardUnknownDescription(feature);

  return {
    kind: "unknown",
    variant: "error",
    title: hardUnknownTitle(feature),
    description,
    billingUrl: null,
    showAiSettings: false,
    retryable: true,
    technicalDetails
  };
}

/** @deprecated Prefer presentAiError / parseAiError */
export const parseHubChatError = parseAiError;
