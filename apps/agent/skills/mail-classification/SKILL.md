---
name: mail-classification
description: >
  Use for every Career Inbox classify decision. Assigns at most one primary
  system label (application, application_status, recruiter, interview, offer,
  job_notifier, noise) from full email content. Prefer this over any keyword guess.
version: 1.0.0
tags:
  - mail
  - classify
  - career-inbox
---

# Career Inbox mail classification

You are the **sole** authority for system labels on inbound career mail.
There is no regex pre-classifier. Read from, subject, preview, and body holistically.

## Allowed system labels (pick zero or one)

| Label                | Use when                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `job_notifier`       | Job-alert digests / multi-role pitches promoting open roles to harvest (LinkedIn Job Alerts, Indeed, Google Job Alerts, Jack and Jill role digests, “N new roles for you”, saved-job digests with listing cards). **Harvest path — not CRM stage mutation.** |
| `application_status` | Status of an existing application (“application was sent”, “we received your application”, portal status). CRM path; **not** a new-job harvest.                                                                                                              |
| `application`        | Application receipts / portal notices that belong on the Applications surface but are not pure status digests.                                                                                                                                               |
| `recruiter`          | Human recruiter / talent outreach about **you** (sourced profile, “are you open to…”), not bulk job boards.                                                                                                                                                  |
| `interview`          | Interview scheduling, screens, loops, HireVue, onsite logistics for **your** candidacy.                                                                                                                                                                      |
| `offer`              | Offer letters, compensation packages, signed offer follow-ups.                                                                                                                                                                                               |
| `noise`              | Product marketing, SaaS updates, board profile spam, non-career clutter.                                                                                                                                                                                     |

If none fit, return **null** / empty system labels.

## Priority when ambiguous

1. **Offer** beats interview/recruiter if the mail is clearly an offer package.
2. **Interview** beats recruiter if the mail is scheduling a screen/loop.
3. **job_notifier** beats interview/application_status when the mail is a **bulk digest of open roles** even if a card title contains the word “interview” or the body mentions “application materials”.
4. **application_status** beats job_notifier when the mail is only about **one past application’s status** with no list of open roles to harvest.
5. **noise** when there is no recruiting / application / job-alert intent.

## job_notifier judgment (critical)

Treat as `job_notifier` when the primary intent is **promoting open positions** for the seeker to consider, including:

- LinkedIn / Indeed / Google job alert digests
- AI job-search assistants (e.g. Jack and Jill) listing multiple roles with links
- “N new senior frontend roles…”, “New matches for you”, fresh market sweeps
- Single-role pitches that still present a listing to apply to

Do **not** use `job_notifier` for:

- Pure welcome/onboarding product email without role listings
- “Your application was sent to Company X” status only
- One-to-one recruiter conversation without a digest of open roles

## User smart filters (dynamic)

When the **user-smart-filters** skill is present for this run, activate it.
Those filters are **tenant-defined categories** (same hub weight as system labels for cards).

- Assign zero or more via `smartRuleSlugs` (only slugs listed in that skill).
- Judge **semantically** (title/description/hints) — never require literal keyword hits.
- Smart filters do **not** replace system labels; both can apply.

When no user-smart-filters skill is injected, leave smartRuleSlugs empty.

## Output

- Exactly **zero or one** primary system label.
- Zero or more `smartRuleSlugs` from the injected user filters.
- `confidence` 0–1 reflecting certainty.
- Short `reason` in plain language (no chain-of-thought dump).
- Never invent `rule:…` labels that are not in the user’s filter list.

## Few-shot corrections

When past user corrections are provided, prefer the user’s labeling style for **similar** mail (same sender pattern / same intent), not only identical subjects.

## References

- Full taxonomy notes: `references/label-taxonomy.md`
