import {
  MAIL_CATEGORY_TO_SYSTEM_LABEL,
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

/** Any system career label present (application | recruiter | interview | offer). */
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
 * Whether a message belongs in a hub category / smart-rule card.
 * Does not apply purpose filter — callers exclude system notifications first.
 */
export function messageMatchesCategory(
  labels: readonly string[],
  category: MailListCategory
): boolean {
  if (category === "all") return true;
  if (category === "unsorted") return isUnsortedMail(labels);
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

/** Hub route slug ↔ category id (`rule-foo` ↔ `rule:foo`). */
export function mailCategoryToSlug(id: string): string {
  return id.startsWith(MAIL_SMART_RULE_LABEL_PREFIX)
    ? id.replace(MAIL_SMART_RULE_LABEL_PREFIX, "rule-")
    : id;
}

export function mailSlugToCategoryId(slug: string): string {
  if (slug.startsWith("rule-")) {
    return `${MAIL_SMART_RULE_LABEL_PREFIX}${slug.slice("rule-".length)}`;
  }
  return slug;
}
