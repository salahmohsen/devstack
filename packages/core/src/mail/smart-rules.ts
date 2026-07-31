import { z } from "zod";

import { MAIL_SMART_RULE_LABEL_PREFIX, MAIL_SYSTEM_LABELS } from "./constants";
import { MailCategoryIconSchema } from "./types";
import { smartRuleLabel } from "./utils";

export const MailSmartRuleSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{0,62}$/, "Use lowercase letters, numbers, hyphens, or underscores");

export const MailSmartRuleSchema = z.object({
  id: z.string().min(1),
  slug: MailSmartRuleSlugSchema,
  title: z.string().min(1).max(80),
  description: z.string().max(280).default(""),
  icon: MailCategoryIconSchema.default("sparkles"),
  /** Case-insensitive keywords; any hit labels the message `rule:{slug}`. */
  keywords: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type MailSmartRule = z.infer<typeof MailSmartRuleSchema>;

export const MailSmartRuleListOutputSchema = z.array(MailSmartRuleSchema);

export const CreateMailSmartRuleInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().default(""),
  icon: MailCategoryIconSchema.optional(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(40).optional().default([]),
  /** Optional; derived from title when omitted. */
  slug: MailSmartRuleSlugSchema.optional(),
  enabled: z.boolean().optional().default(true)
});
export type CreateMailSmartRuleInput = z.infer<typeof CreateMailSmartRuleInputSchema>;

export const UpdateMailSmartRuleInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).optional(),
  icon: MailCategoryIconSchema.optional(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional()
});
export type UpdateMailSmartRuleInput = z.infer<typeof UpdateMailSmartRuleInputSchema>;

export const MailSmartRuleIdInputSchema = z.object({
  id: z.string().min(1)
});

/** Pure slug from title for create defaults. */
export function slugifySmartRuleTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base.length > 0 ? base : "rule";
}

export type SmartRuleMatchInput = {
  slug: string;
  keywords: readonly string[];
  enabled?: boolean;
};

/**
 * Match enabled smart rules against mail text (any keyword, case-insensitive).
 * Returns `rule:{slug}` labels (deduped, rule order preserved).
 */
export function matchSmartRuleLabels(
  haystack: string,
  rules: readonly SmartRuleMatchInput[]
): string[] {
  const text = haystack.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (rule.enabled === false) continue;
    const keywords = rule.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (keywords.length === 0) continue;
    const hit = keywords.some((kw) => text.includes(kw));
    if (!hit) continue;
    const label = smartRuleLabel(rule.slug);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** Merge system labels with smart-rule labels; drop empty system when only rules hit. */
export function mergeClassifyLabelsWithSmartRules(input: {
  systemLabels: string[];
  existingLabels: string[];
  smartRuleLabels: string[];
}): string[] {
  const nonSystemExisting = input.existingLabels.filter(
    (l) => !l.startsWith(MAIL_SMART_RULE_LABEL_PREFIX) && !isSystemCareer(l)
  );
  const system = input.systemLabels.filter(isSystemCareer);
  const rules = input.smartRuleLabels.filter((l) => l.startsWith(MAIL_SMART_RULE_LABEL_PREFIX));
  // Prefer newly matched rules; keep any prior rule labels user may have set later
  const priorRules = input.existingLabels.filter((l) => l.startsWith(MAIL_SMART_RULE_LABEL_PREFIX));
  const ruleSet = new Set([...rules, ...priorRules]);
  return [...system, ...nonSystemExisting, ...ruleSet];
}

function isSystemCareer(label: string): boolean {
  return (MAIL_SYSTEM_LABELS as readonly string[]).includes(label);
}

export function smartRuleToCategoryCard(
  rule: Pick<MailSmartRule, "slug" | "title" | "description" | "icon">
) {
  return {
    id: smartRuleLabel(rule.slug),
    title: rule.title,
    description: rule.description || `Smart rule · ${rule.slug}`,
    icon: rule.icon,
    kind: "rule" as const
  };
}
