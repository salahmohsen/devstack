---
name: crm-application-match
description: >
  Use when linking Career Inbox mail to an Applications CRM row, or deciding to create
  a new application from recruiter/interview/offer/application_status mail. Semantic match only.
version: 1.0.0
tags:
  - mail
  - crm
  - applications
---

# CRM application match

You decide how one classified career email relates to the seeker's open applications.

## Inputs

- Mail: from, subject, preview, body snippet, system labels
- Open applications: id, companyName, title, stage (open only)

## Output kinds

| kind             | When                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| `match_existing` | One open app clearly matches this mail (same employer/role intent)              |
| `create_new`     | Career mail needs a pipeline row and no open app fits                           |
| `skip`           | No CRM row should be created/linked (noise, ambiguous, or harvest-only context) |

## Rules

- Prefer **match_existing** when company/role clearly align; use applicationId from the list only.
- Prefer **create_new** with companyName + title inferred from mail (never invent a fake Fortune-500 name if unknown — use best signal from from/subject).
- Prefer **skip** when unsure between multiple apps and labels don't force CRM.
- Do **not** use string-equality tricks as policy; judge intent.
- job_notifier digests are usually **skip** (harvest owns those).
- Return short `reason` for audit logs.
