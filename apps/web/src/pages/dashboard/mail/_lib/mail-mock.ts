export const MAIL_CATEGORY_IDS = [
  "applications",
  "recruiters",
  "interviews",
  "offers",
  "unsorted",
  "all"
] as const;

export type MailCategoryId = (typeof MAIL_CATEGORY_IDS)[number];

export type MailCategory = {
  id: MailCategoryId | `rule:${string}`;
  title: string;
  description: string;
  count: number;
  unread: number;
  /** lucide icon name key used by UI */
  icon: "briefcase" | "users" | "calendar" | "gift" | "inbox" | "mail" | "sparkles";
  kind: "system" | "rule";
};

export type MailMessage = {
  id: string;
  categoryIds: MailCategoryId[];
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  unread: boolean;
  labels: string[];
};

export const MAIL_CATEGORIES: MailCategory[] = [
  {
    id: "applications",
    title: "Applications",
    description: "Linked to roles in your pipeline",
    count: 12,
    unread: 3,
    icon: "briefcase",
    kind: "system"
  },
  {
    id: "recruiters",
    title: "Recruiters",
    description: "People and agencies reaching out",
    count: 8,
    unread: 2,
    icon: "users",
    kind: "system"
  },
  {
    id: "interviews",
    title: "Interviews",
    description: "Scheduling and interview loops",
    count: 4,
    unread: 1,
    icon: "calendar",
    kind: "system"
  },
  {
    id: "offers",
    title: "Offers",
    description: "Offer letters and compensation",
    count: 1,
    unread: 0,
    icon: "gift",
    kind: "system"
  },
  {
    id: "unsorted",
    title: "Unsorted",
    description: "No career or smart-rule label yet",
    count: 38,
    unread: 11,
    icon: "inbox",
    kind: "system"
  },
  {
    id: "all",
    title: "All mail",
    description: "Everything in Career Inbox",
    count: 63,
    unread: 17,
    icon: "mail",
    kind: "system"
  },
  {
    id: "rule:newsletter-noise",
    title: "Newsletters",
    description: "Smart rule: product digests",
    count: 9,
    unread: 0,
    icon: "sparkles",
    kind: "rule"
  }
];

export const MAIL_MESSAGES: MailMessage[] = [
  {
    id: "m1",
    categoryIds: ["recruiters", "applications"],
    from: "Jordan Lee",
    fromEmail: "jordan@northline.talent",
    subject: "Senior fullstack role — quick chat?",
    preview: "We are hiring for a product-facing TypeScript role and your portfolio stood out…",
    body: "Hi,\n\nWe are hiring for a product-facing TypeScript role and your portfolio stood out. Would you be open to a 20-minute intro call this week?\n\nBest,\nJordan",
    receivedAt: "2026-07-28T14:20:00.000Z",
    unread: true,
    labels: ["recruiter", "application"]
  },
  {
    id: "m2",
    categoryIds: ["interviews", "applications"],
    from: "Acme Hiring",
    fromEmail: "hiring@acme.example",
    subject: "Interview loop — staff engineer",
    preview: "Thanks for applying. We would like to schedule a technical interview…",
    body: "Thanks for applying. We would like to schedule a technical interview next week. Please pick a slot on the link below.\n\n— Acme Talent",
    receivedAt: "2026-07-27T09:05:00.000Z",
    unread: true,
    labels: ["interview"]
  },
  {
    id: "m3",
    categoryIds: ["offers"],
    from: "People Ops",
    fromEmail: "people@helix.example",
    subject: "Offer package for Staff Engineer",
    preview: "Attached is the formal offer and equity summary…",
    body: "Congratulations. Attached is the formal offer and equity summary. Reply when you are ready to discuss details.\n\n— People Ops",
    receivedAt: "2026-07-20T16:40:00.000Z",
    unread: false,
    labels: ["offer"]
  },
  {
    id: "m4",
    categoryIds: ["unsorted"],
    from: "Ship It Weekly",
    fromEmail: "hello@shipit.example",
    subject: "This week in DX tools",
    preview: "Five releases worth skimming…",
    body: "Five releases worth skimming this week. Not career-critical — lands in Unsorted until a smart rule claims it.",
    receivedAt: "2026-07-29T08:00:00.000Z",
    unread: true,
    labels: []
  },
  {
    id: "m5",
    categoryIds: ["applications"],
    from: "Greenhouse",
    fromEmail: "no-reply@greenhouse.example",
    subject: "Application received — Platform Engineer",
    preview: "We received your application for Platform Engineer…",
    body: "We received your application for Platform Engineer. This is an automated confirmation.",
    receivedAt: "2026-07-25T11:12:00.000Z",
    unread: false,
    labels: ["application", "ats"]
  }
];

export function isMailCategoryId(value: string): value is MailCategoryId {
  return (MAIL_CATEGORY_IDS as readonly string[]).includes(value);
}

export function getCategory(id: string): MailCategory | undefined {
  return MAIL_CATEGORIES.find((c) => c.id === id);
}

export function messagesForCategory(categoryId: string): MailMessage[] {
  if (categoryId === "all") return MAIL_MESSAGES;
  if (categoryId.startsWith("rule:")) {
    // Mock: newsletters rule shows unsorted-like digests
    return MAIL_MESSAGES.filter((m) => m.categoryIds.includes("unsorted"));
  }
  return MAIL_MESSAGES.filter((m) => m.categoryIds.includes(categoryId as MailCategoryId));
}
