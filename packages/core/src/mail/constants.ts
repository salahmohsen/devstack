import {
  type MailCategoryCard,
  type MailCategoryIcon,
  type MailCategoryId,
  type MailPurpose,
  type MailSystemLabel
} from "./types";

export const MAIL_CATEGORY_IDS = [
  "applications",
  "recruiters",
  "interviews",
  "offers",
  "unsorted",
  "all"
] as const satisfies readonly MailCategoryId[];

export const MAIL_SYSTEM_LABELS = [
  "application",
  "recruiter",
  "interview",
  "offer"
] as const satisfies readonly MailSystemLabel[];

/** Hub category (except unsorted/all) → system career label. */
export const MAIL_CATEGORY_TO_SYSTEM_LABEL = {
  applications: "application",
  recruiters: "recruiter",
  interviews: "interview",
  offers: "offer"
} as const satisfies Record<Exclude<MailCategoryId, "unsorted" | "all">, MailSystemLabel>;

export const MAIL_SYSTEM_LABEL_TO_CATEGORY = {
  application: "applications",
  recruiter: "recruiters",
  interview: "interviews",
  offer: "offers"
} as const satisfies Record<MailSystemLabel, Exclude<MailCategoryId, "unsorted" | "all">>;

export const MAIL_PURPOSE = [
  "career",
  "system_notification"
] as const satisfies readonly MailPurpose[];

export const DEFAULT_MAIL_PURPOSE: MailPurpose = "career";

/** Smart-rule labels are stored as `rule:{slug}` on the message. */
export const MAIL_SMART_RULE_LABEL_PREFIX = "rule:" as const;

export const MAIL_CATEGORY_LABELS: Record<MailCategoryId, string> = {
  applications: "Applications",
  recruiters: "Recruiters",
  interviews: "Interviews",
  offers: "Offers",
  unsorted: "Unsorted",
  all: "All mail"
};

export const MAIL_CATEGORY_DESCRIPTIONS: Record<MailCategoryId, string> = {
  applications: "Linked to roles in your pipeline",
  recruiters: "People and agencies reaching out",
  interviews: "Scheduling and interview loops",
  offers: "Offer letters and compensation",
  unsorted: "No career or smart-rule label yet",
  all: "Everything in Career Inbox"
};

export const MAIL_CATEGORY_ICONS: Record<MailCategoryId, MailCategoryIcon> = {
  applications: "briefcase",
  recruiters: "users",
  interviews: "calendar",
  offers: "gift",
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
