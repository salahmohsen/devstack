import {
  type MailCategoryCard,
  type MailCategoryIcon,
  type MailCategoryId,
  type MailPurpose,
  type MailSystemLabel
} from "./types";

export const MAIL_CATEGORY_IDS = [
  "needs_action",
  "applications",
  "recruiters",
  "interviews",
  "offers",
  "noise",
  "unsorted",
  "all"
] as const satisfies readonly MailCategoryId[];

export const MAIL_SYSTEM_LABELS = [
  "application",
  "recruiter",
  "interview",
  "offer",
  "job_notifier",
  "noise",
  "application_status"
] as const satisfies readonly MailSystemLabel[];

/**
 * Labels that put a message in the **Needs action** hub filter (computed, not a stored label).
 * Pure `noise` / pure `job_notifier` are excluded — they do not appear in this set.
 * Keep in sync with `packages/db` mail-message.repository categoryClause.
 */
export const MAIL_NEEDS_ACTION_LABELS = [
  "recruiter",
  "interview",
  "offer",
  "application_status"
] as const satisfies readonly MailSystemLabel[];

/**
 * Hub category (except unsorted/all/needs_action) → primary system label for list filter.
 * `needs_action` is a computed filter (see MAIL_NEEDS_ACTION_LABELS), not a label map.
 */
export const MAIL_CATEGORY_TO_SYSTEM_LABEL = {
  applications: "application",
  recruiters: "recruiter",
  interviews: "interview",
  offers: "offer",
  noise: "noise"
} as const satisfies Record<
  Exclude<MailCategoryId, "unsorted" | "all" | "needs_action">,
  MailSystemLabel
>;

/**
 * System label → hub card category.
 * `job_notifier` has no dedicated card (harvest → Applications CRM).
 */
export const MAIL_SYSTEM_LABEL_TO_CATEGORY = {
  application: "applications",
  application_status: "applications",
  recruiter: "recruiters",
  interview: "interviews",
  offer: "offers",
  noise: "noise"
} as const satisfies Partial<
  Record<MailSystemLabel, Exclude<MailCategoryId, "unsorted" | "all" | "needs_action">>
>;

export const MAIL_PURPOSE = [
  "career",
  "system_notification"
] as const satisfies readonly MailPurpose[];

export const DEFAULT_MAIL_PURPOSE: MailPurpose = "career";

/** Smart-rule labels are stored as `rule:{slug}` on the message. */
export const MAIL_SMART_RULE_LABEL_PREFIX = "rule:" as const;

export const MAIL_CATEGORY_LABELS: Record<MailCategoryId, string> = {
  needs_action: "Needs action",
  applications: "Applications",
  recruiters: "Recruiters",
  interviews: "Interviews",
  offers: "Offers",
  noise: "Noise",
  unsorted: "Unsorted",
  all: "All mail"
};

export const MAIL_CATEGORY_DESCRIPTIONS: Record<MailCategoryId, string> = {
  needs_action: "Replies, interviews, and status that need you",
  applications: "Linked to roles in your pipeline",
  recruiters: "People and agencies reaching out",
  interviews: "Scheduling and interview loops",
  offers: "Offer letters and compensation",
  noise: "Product updates and non-career mail",
  unsorted: "No career or smart-rule label yet",
  all: "Everything in Career Inbox"
};

export const MAIL_CATEGORY_ICONS: Record<MailCategoryId, MailCategoryIcon> = {
  needs_action: "sparkles",
  applications: "briefcase",
  recruiters: "users",
  interviews: "calendar",
  offers: "gift",
  noise: "inbox",
  unsorted: "inbox",
  all: "mail"
};

/** Static hub cards for system categories (counts come from API later). */
export const MAIL_SYSTEM_CATEGORY_CARDS: readonly MailCategoryCard[] = MAIL_CATEGORY_IDS.map(
  (id) => {
    return {
      id,
      title: MAIL_CATEGORY_LABELS[id],
      description: MAIL_CATEGORY_DESCRIPTIONS[id],
      icon: MAIL_CATEGORY_ICONS[id],
      kind: "system" as const
    };
  }
);
