import {
  MAIL_CATEGORY_TO_SYSTEM_LABEL,
  MAIL_NEEDS_ACTION_LABELS,
  MAIL_SMART_RULE_LABEL_PREFIX,
  MAIL_SYSTEM_LABELS
} from "./constants";
import {
  MailCategoryIdSchema,
  MailSystemLabelSchema,
  type MailCategoryId,
  type MailListCategory,
  type MailPurpose,
  type MailSystemLabel
} from "./types";

export function isMailCategoryId(value: string): value is MailCategoryId {
  return MailCategoryIdSchema.safeParse(value).success;
}

export function isMailSystemLabel(value: string): value is MailSystemLabel {
  return MailSystemLabelSchema.safeParse(value).success;
}

export function isSmartRuleLabel(label: string): boolean {
  return label.startsWith(MAIL_SMART_RULE_LABEL_PREFIX);
}

export function smartRuleLabel(slug: string): string {
  const normalized = slug.replace(/^rule:/i, "").trim();
  return `${MAIL_SMART_RULE_LABEL_PREFIX}${normalized}`;
}

export function isSystemNotificationPurpose(purpose: MailPurpose): boolean {
  return purpose === "system_notification";
}

/** Any system label present (career buckets, job_notifier, noise, application_status). */
export function hasSystemCareerLabel(labels: readonly string[]): boolean {
  return labels.some((label) => (MAIL_SYSTEM_LABELS as readonly string[]).includes(label));
}

export function hasSmartRuleLabel(labels: readonly string[]): boolean {
  return labels.some(isSmartRuleLabel);
}

/**
 * Unsorted: no system career label and no smart-rule label.
 * Purpose filtering is separate (default lists already drop system_notification).
 */
export function isUnsortedMail(labels: readonly string[]): boolean {
  return !hasSystemCareerLabel(labels) && !hasSmartRuleLabel(labels);
}

/**
 * Needs action hub filter: labels overlap MAIL_NEEDS_ACTION_LABELS.
 * Pure `noise` / pure `job_notifier` never match (no action labels).
 */
export function isNeedsActionMail(labels: readonly string[]): boolean {
  const action = MAIL_NEEDS_ACTION_LABELS as readonly string[];
  return labels.some((label) => action.includes(label));
}

/**
 * Whether a message belongs in a hub category / smart-rule card.
 * Does not apply purpose filter — callers exclude system notifications first.
 */
export function messageMatchesCategory(
  labels: readonly string[],
  category: MailListCategory
): boolean {
  if (category === "all") return true;
  if (category === "unsorted") return isUnsortedMail(labels);
  if (category === "needs_action") return isNeedsActionMail(labels);
  if (typeof category === "string" && category.startsWith(MAIL_SMART_RULE_LABEL_PREFIX)) {
    return labels.includes(category);
  }
  if (isMailCategoryId(category) && category in MAIL_CATEGORY_TO_SYSTEM_LABEL) {
    const systemLabel =
      MAIL_CATEGORY_TO_SYSTEM_LABEL[category as keyof typeof MAIL_CATEGORY_TO_SYSTEM_LABEL];
    return labels.includes(systemLabel);
  }
  return false;
}

/**
 * Hub route slug ↔ category id.
 * - `rule:foo` ↔ `rule-foo`
 * - `needs_action` ↔ `needs-action` (underscores → hyphens for URL segments)
 */
export function mailCategoryToSlug(id: string): string {
  if (id.startsWith(MAIL_SMART_RULE_LABEL_PREFIX)) {
    return id.replace(MAIL_SMART_RULE_LABEL_PREFIX, "rule-");
  }
  return id.replaceAll("_", "-");
}

export function mailSlugToCategoryId(slug: string): string {
  if (slug.startsWith("rule-")) {
    return `${MAIL_SMART_RULE_LABEL_PREFIX}${slug.slice("rule-".length)}`;
  }
  return slug.replaceAll("-", "_");
}
