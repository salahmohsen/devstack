/**
 * Dev/fixture helpers for Career Inbox UI — **not** used by the live list/reader path.
 * Production mail loads via `features/mail` → oRPC `mail.list` / `mail.get`.
 *
 * Keep only if you need sample payloads for Storybook/manual UI checks.
 */

export const MAIL_FIXTURE_MESSAGES = [
  {
    id: "m1",
    fromName: "Jordan Lee",
    fromEmail: "jordan@northline.talent",
    subject: "Senior fullstack role — quick chat?",
    preview: "We are hiring for a product-facing TypeScript role and your portfolio stood out…",
    bodyText:
      "Hi,\n\nWe are hiring for a product-facing TypeScript role and your portfolio stood out. Would you be open to a 20-minute intro call this week?\n\nBest,\nJordan",
    receivedAt: "2026-07-28T14:20:00.000Z",
    unread: true,
    labels: ["recruiter"],
    application: { companyName: "Northline", title: "Senior Fullstack" }
  }
] as const;
