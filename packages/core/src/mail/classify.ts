import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";

import { MAIL_SYSTEM_LABELS } from "./constants";
import { AiCorrectionFewShotExampleSchema } from "./corrections";
import {
  matchSmartRuleLabels,
  mergeClassifyLabelsWithSmartRules,
  type SmartRuleMatchInput
} from "./smart-rules";
import { MailSystemLabelSchema, type MailSystemLabel } from "./types";
import { smartRuleLabel } from "./utils";

/** Tenant smart filter (user-defined) passed into AI classify as skill/prompt injection. */
export const MailClassifySmartRuleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().default(""),
  description: z.string().default(""),
  /** Soft hints for the model — not deterministic match keys. */
  keywords: z.array(z.string()).default([]),
  enabled: z.boolean().optional()
});
export type MailClassifySmartRule = z.infer<typeof MailClassifySmartRuleSchema>;

/** Job payload already lives in classify-queue.ts; this is workflow I/O. */
export const MailClassifyInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromName: z.string().default(""),
  fromEmail: z.string().min(1),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  /** Existing labels (non-system may be preserved). */
  labels: z.array(z.string()).default([]),
  /**
   * Tenant smart filters (server loads). Injected into the classify agent as a
   * dynamic skill + prompt section — AI decides `rule:{slug}` labels.
   */
  smartRules: z.array(MailClassifySmartRuleSchema).optional().default([]),
  /** Last-K user corrections for few-shot (server loads, userId-scoped). */
  fewShotCorrections: z.array(AiCorrectionFewShotExampleSchema).optional().default([]),
  /**
   * Server-resolved BYO model + key for this run (Settings → AI).
   * Agent must not log `llm.apiKey`.
   */
  llm: RuntimeLlmConfigSchema.optional()
});
export type MailClassifyInput = z.infer<typeof MailClassifyInputSchema>;

export const MailClassifyOutputSchema = z.object({
  labels: z.array(z.string()),
  systemLabels: z.array(MailSystemLabelSchema),
  /** How classification was produced. */
  source: z.enum(["skip_already_classified", "heuristic", "llm"]),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
});
export type MailClassifyOutput = z.infer<typeof MailClassifyOutputSchema>;

const OFFER_RE =
  /\b(offer\s+letter|compensation\s+package|salary\s+offer|we\s+are\s+pleased\s+to\s+offer|job\s+offer)\b/i;
const INTERVIEW_RE =
  /\b(interview|onsite|on-site|phone\s+screen|technical\s+screen|hirevue|loop\s+interview|scheduling\s+interview)\b/i;
const RECRUITER_RE =
  /\b(recruiter|talent\s+acquisition|i\s+came\s+across\s+your\s+profile|opportunity\s+for\s+you|are\s+you\s+open\s+to)\b/i;
/** Application status updates — CRM path, not new-job harvest. */
const APPLICATION_STATUS_RE =
  /\b(application\s+(was\s+)?(sent|received|update|status|viewed)|thank\s+you\s+for\s+applying|thanks\s+for\s+applying|we\s+received\s+your\s+application|application\s+has\s+been\s+received|successfully\s+applied|application\s+confirmation|candidate\s+portal|your\s+application|application\s+was\s+sent)\b/i;
/** LinkedIn/Indeed/Jack&Jill/Otta/Wellfound digests — must not become interview/offer or create CRM apps. */
const JOB_ALERT_DIGEST_RE =
  /\b(job\s+alert|jobs?\s+alerts?|your\s+job\s+alert|linkedin\s+job\s+alerts?|jobs?\s+you\s+may\s+be\s+interested|jobs?\s+you\s+might\s+like|recommended\s+jobs?|see\s+all\s+jobs|manage\s+(your\s+)?alerts?|jobalerts?[-.]noreply|indeed\.com|new\s+matches\s+for\s+you|fresh\s+sweep\s+of\s+the\s+market|new\s+senior\s+(frontend\s+)?roles?|roles?\s+we\s+found|opportunities\s+matching|openings?\s+this\s+week)\b|\d+\s+new\b[\s\S]{0,80}\b(roles?|jobs?|positions?|openings?)\b|\d+\s+(open\s+)?(roles?|positions?|openings?)\b/i;
/** Exact local-parts only — do not match messaging-digest-noreply@linkedin.com. */
const JOB_ALERT_FROM_RE =
  /(?:^|[\s<,;])(?:jobalerts?[-.]noreply@|jobs-noreply@|noreply@linkedin\.com|jobs@indeed\.com|alerts@indeed\.com)|@(?:otta\.com|wellfound\.com|angel\.co|builtin\.com)\b|notify-noreply@google\.com/i;
/** ATS receipt senders — usually application_status, never job_notifier. */
const ATS_RECEIPT_FROM_RE =
  /@(?:[a-z0-9-]+\.)*(?:greenhouse\.io|lever\.co|ashbyhq\.com|workablemail\.com|smartrecruiters\.com)\b/i;
/** Jack and Jill AI job-search digests (multi-role + single-role pitches). */
const JACK_AND_JILL_FROM_RE = /@jackandjill\.ai\b/i;
/** Welcome/onboarding from Jack — not a job listing digest. */
const JACK_AND_JILL_ONBOARDING_RE =
  /\b(ready\s+to\s+kick\s+things\s+off|good\s+to\s+have\s+you\s+here|i['’]m\s+jack[,.]?\s+and\s+i['’]ll\s+be\s+doing)\b/i;

/**
 * Product / marketing noise domains from Gmail corpus (non-career).
 * Careers/recruiting subdomains and subjects are handled by career heuristics first.
 */
const NOISE_FROM_DOMAIN_RE =
  /@(?:[a-z0-9-]+\.)*(?:github\.com|spotify\.com|substack\.com|cloudflare\.com|openai\.com)\b/i;
/** Airbnb product mail — exclude careers/recruiting-ish addresses. */
const AIRBNB_PRODUCT_FROM_RE = /@(?!careers\.)(?:[a-z0-9-]+\.)*airbnb\.com\b/i;
const WUZZUF_MARKETING_RE =
  /\b(wuzzuf|complete\s+your\s+profile|boost\s+your\s+profile|profile\s+views?|employers?\s+viewed)\b/i;

/**
 * @deprecated Production classify is AI + `mail-classification` skill only.
 * Kept for offline fixtures / migration scripts — do not call from server paths.
 */
export function isJobAlertDigestMail(input: {
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  preview?: string;
  bodyText?: string;
}): boolean {
  const fromBlob = `${input.fromName ?? ""} ${input.fromEmail ?? ""}`;
  if (JOB_ALERT_FROM_RE.test(fromBlob)) return true;

  const haystack = [input.subject, input.preview, (input.bodyText ?? "").slice(0, 4_000)]
    .join("\n")
    .slice(0, 8_000);

  // Jack and Jill: role digests / pitches, but not welcome/onboarding mail.
  if (JACK_AND_JILL_FROM_RE.test(fromBlob) || /jack\s+and\s+jill/i.test(fromBlob)) {
    if (JACK_AND_JILL_ONBOARDING_RE.test(haystack)) return false;
    // Role list, single-role pitch, or pipeline nudge with listings.
    if (
      /\b(roles?|matches?|engineer|frontend|backend|full[- ]?stack|react|remote|hybrid)\b/i.test(
        haystack
      )
    ) {
      return true;
    }
  }

  return JOB_ALERT_DIGEST_RE.test(haystack);
}

function isAtsApplicationReceipt(input: {
  fromEmail?: string;
  subject?: string;
  preview?: string;
  bodyText?: string;
}): boolean {
  const fromBlob = input.fromEmail ?? "";
  if (!ATS_RECEIPT_FROM_RE.test(fromBlob)) return false;
  const haystack = [input.subject, input.preview, (input.bodyText ?? "").slice(0, 2_000)]
    .join("\n")
    .slice(0, 4_000);
  return APPLICATION_STATUS_RE.test(haystack);
}

function isNoiseMail(input: {
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  preview?: string;
  bodyText?: string;
}): boolean {
  const fromBlob = `${input.fromName ?? ""} ${input.fromEmail ?? ""}`;
  if (NOISE_FROM_DOMAIN_RE.test(fromBlob)) return true;
  if (AIRBNB_PRODUCT_FROM_RE.test(fromBlob)) {
    // Careful: recruiting from Airbnb should not be noise.
    const careerish =
      /\b(career|recruit|hiring|talent|interview|application|role|position)\b/i.test(
        [input.subject, input.preview, (input.bodyText ?? "").slice(0, 1_000)].join("\n")
      );
    if (!careerish) return true;
  }
  const haystack = [input.subject, input.preview, (input.bodyText ?? "").slice(0, 2_000)]
    .join("\n")
    .slice(0, 4_000);
  if (WUZZUF_MARKETING_RE.test(haystack) && /wuzzuf/i.test(fromBlob + haystack)) return true;
  return false;
}

/**
 * @deprecated Production classify is Mastra AI only (`mail-classify-workflow` + skills).
 * Do not call from server or workflows.
 */
export function heuristicClassifyMail(input: MailClassifyInput): MailClassifyOutput {
  const haystack = [input.fromName, input.fromEmail, input.subject, input.preview, input.bodyText]
    .join("\n")
    .slice(0, 20_000);

  let system: MailSystemLabel | null = null;
  let confidence = 0.55;
  let notes: string | undefined;

  // Digests first — "interview" can appear inside a job card list.
  if (isJobAlertDigestMail(input)) {
    system = "job_notifier";
    confidence = 0.9;
    notes = "heuristic:job_notifier";
  } else if (OFFER_RE.test(haystack)) {
    system = "offer";
    confidence = 0.75;
    notes = "heuristic:offer";
  } else if (INTERVIEW_RE.test(haystack)) {
    system = "interview";
    confidence = 0.7;
    notes = "heuristic:interview";
  } else if (RECRUITER_RE.test(haystack)) {
    system = "recruiter";
    confidence = 0.65;
    notes = "heuristic:recruiter";
  } else if (isAtsApplicationReceipt(input) || APPLICATION_STATUS_RE.test(haystack)) {
    system = "application_status";
    confidence = isAtsApplicationReceipt(input) ? 0.8 : 0.65;
    notes = "heuristic:application_status";
  } else if (isNoiseMail(input)) {
    system = "noise";
    confidence = 0.7;
    notes = "heuristic:noise";
  }

  const systemLabels = system ? [system] : [];
  const smartRuleLabels = matchSmartRuleLabels(
    haystack,
    (input.smartRules ?? []) as SmartRuleMatchInput[]
  );
  const labels = mergeClassifyLabelsWithSmartRules({
    systemLabels,
    existingLabels: input.labels,
    smartRuleLabels
  });

  const ruleNote = smartRuleLabels.length > 0 ? `smart:${smartRuleLabels.join(",")}` : undefined;

  return {
    labels,
    systemLabels,
    source: "heuristic",
    confidence: smartRuleLabels.length > 0 && !system ? 0.7 : confidence,
    notes: [notes, ruleNote].filter(Boolean).join(";")
  };
}

/**
 * @deprecated Keyword matching is removed from production.
 * Smart filters are AI-assigned via skill/prompt injection in mail-classify-workflow.
 * Prefer {@link assembleClassifyLabelsFromAi}.
 */
export function applySmartRulesToClassifyResult(
  input: MailClassifyInput,
  result: MailClassifyOutput
): MailClassifyOutput {
  const haystack = [input.fromName, input.fromEmail, input.subject, input.preview, input.bodyText]
    .join("\n")
    .slice(0, 20_000);
  const smartRuleLabels = matchSmartRuleLabels(
    haystack,
    (input.smartRules ?? []) as SmartRuleMatchInput[]
  );
  if (smartRuleLabels.length === 0) return result;

  const labels = mergeClassifyLabelsWithSmartRules({
    systemLabels: result.systemLabels,
    existingLabels: result.labels,
    smartRuleLabels
  });
  return {
    ...result,
    labels,
    notes: [result.notes, `smart:${smartRuleLabels.join(",")}`].filter(Boolean).join(";")
  };
}

/** Enabled smart filters only (for AI injection). */
export function enabledSmartRulesForClassify(
  rules: readonly MailClassifySmartRule[] | undefined | null
): MailClassifySmartRule[] {
  return (rules ?? []).filter((r) => r.enabled !== false && r.slug.trim().length > 0);
}

/**
 * Markdown block for dynamic skill instructions / prompt injection.
 * Describes filters for the model — does not match mail content.
 */
export function formatUserSmartFiltersSkillInstructions(
  rules: readonly MailClassifySmartRule[]
): string {
  const enabled = enabledSmartRulesForClassify(rules);
  if (enabled.length === 0) {
    return `No user smart filters for this tenant. Do not invent rule: labels.`;
  }

  const lines = enabled.map((r, i) => {
    const hints =
      r.keywords.length > 0
        ? `\n   Semantic hints (not exact keywords): ${r.keywords.join("; ")}`
        : "";
    return `${i + 1}. **${r.title || r.slug}** → label \`${smartRuleLabel(r.slug)}\`
   Slug: \`${r.slug}\`
   Intent: ${r.description?.trim() || "(no description — use title + hints)"}${hints}`;
  });

  return `# User smart filters (this tenant)

These are user-defined Career Inbox categories, **equal in weight to system labels for hub cards**.
You may assign **zero or more** of them in addition to at most one system label.

Only use labels from this list (as \`rule:{slug}\`). Never invent new slugs.

Judge **semantically** from from/subject/body — do not require literal keyword matches.
A filter matches when the message intent fits the filter's title/description/hints.

## Filters

${lines.join("\n\n")}

## Output

- \`smartRuleSlugs\`: array of slugs from the list above that apply (without the \`rule:\` prefix is fine; both accepted).
- Multiple smart filters may apply.
- Smart filters do not replace system labels — pick both when appropriate.
`;
}

/**
 * Assemble final labels from AI system label + AI smart-rule slugs.
 * Only allows smart-rule labels whose slug is in the enabled tenant list (anti-invention).
 */
export function assembleClassifyLabelsFromAi(input: {
  systemLabels: MailSystemLabel[];
  /** Slugs or rule:slug from the model. */
  smartRuleSlugs: readonly string[];
  /** Tenant enabled rules. */
  smartRules: readonly MailClassifySmartRule[];
  existingLabels?: readonly string[];
}): string[] {
  const allowed = new Set(
    enabledSmartRulesForClassify(input.smartRules).map((r) => r.slug.toLowerCase())
  );

  const smartLabels: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.smartRuleSlugs) {
    const slug = raw
      .replace(/^rule:/i, "")
      .trim()
      .toLowerCase();
    if (!slug || !allowed.has(slug)) continue;
    const label = smartRuleLabel(slug);
    if (seen.has(label)) continue;
    seen.add(label);
    smartLabels.push(label);
  }

  const existing = input.existingLabels ?? [];
  const nonSystemExisting = existing.filter(
    (l) => !(MAIL_SYSTEM_LABELS as readonly string[]).includes(l) && !l.startsWith("rule:")
  );

  return mergeClassifyLabelsWithSmartRules({
    systemLabels: input.systemLabels,
    existingLabels: nonSystemExisting,
    smartRuleLabels: smartLabels
  });
}

/**
 * Safety net after AI: well-known job-alert digests must stay `job_notifier`
 * so harvest runs (models often mislabel cards that mention "interview").
 * Does not override a clear offer.
 */
export function applyJobAlertDigestGuard(
  input: Pick<MailClassifyInput, "fromEmail" | "fromName" | "subject" | "preview" | "bodyText">,
  result: MailClassifyOutput
): MailClassifyOutput {
  if (!isJobAlertDigestMail(input)) return result;
  if (result.systemLabels.includes("job_notifier")) return result;
  if (result.systemLabels.includes("offer")) return result;

  const smartOnly = result.labels.filter((l) => l.startsWith("rule:"));
  const systemLabels: MailSystemLabel[] = ["job_notifier"];
  return {
    ...result,
    systemLabels,
    labels: [...systemLabels, ...smartOnly],
    confidence: Math.max(result.confidence ?? 0, 0.85),
    notes: [result.notes, "guard:job_alert_digest→job_notifier"].filter(Boolean).join(";")
  };
}

/**
 * @deprecated Prefer {@link applyJobAlertDigestGuard}. Kept for existing tests.
 */
export function suppressCareerLabelsForJobAlertDigest(
  input: MailClassifyInput,
  result: MailClassifyOutput
): MailClassifyOutput {
  if (!isJobAlertDigestMail(input)) return result;

  const onlyJobNotifier =
    result.systemLabels.length === 1 && result.systemLabels[0] === "job_notifier";
  if (onlyJobNotifier && result.notes?.includes("job_notifier")) return result;

  const smartOnly = result.labels.filter((l) => l.startsWith("rule:"));
  const systemLabels: MailSystemLabel[] = ["job_notifier"];
  return {
    ...result,
    systemLabels,
    labels: [...systemLabels, ...smartOnly],
    confidence: Math.max(result.confidence ?? 0, 0.85),
    notes: [result.notes, "suppress:job_alert_digest→job_notifier"].filter(Boolean).join(";")
  };
}
