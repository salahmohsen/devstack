---
name: application-apply-package
description: >
  Use when building a tailored apply package for one job application:
  select portfolio experiences/projects/stacks, rewrite bullets from evidence,
  and draft cover letter + recruiter outreach email. Structured draft only.
version: 1.0.0
tags:
  - application
  - resume
  - cover-letter
  - outreach
---

# Application apply package

You produce a **reviewable apply package draft** for one job: tailored resume pieces,
formal cover letter, and short outreach email. The seeker will edit before Accept.

## Inputs you receive

- **Job**: title, company, description (and optional listing page text when JD was thin)
- **Portfolio snapshot**: profile, contacts, experiences, projects, stacks
- Projects may include private **`analysis`** — use it only as rewrite signal (see below)

## Core rules (non-negotiable)

1. **Select + rewrite only.** Choose which portfolio items to include and rewrite language.
2. **Never invent** employers, job titles, project names, metrics, tools, or achievements that are not grounded in the provided portfolio (or private project analysis).
3. **Ids must match input.** Every `experienceId` / `projectId` / `stackId` must come from the portfolio snapshot. Do not invent ids.
4. **Ground rewrites** in the item’s existing description/summary/bullets (+ private analysis for projects when present). Prefer stronger, clearer phrasing for the target role; do not fabricate scope.
5. **Return structured draft only** (schema). No free-form essay outside the fields.

## Selection guidance

- Prefer items that best evidence the job’s requirements (stack, domain, seniority, impact).
- Set `include: true` for items that should appear on the tailored resume PDF.
- Set `include: false` for items you still list for reviewer visibility but recommend excluding.
- Include at least one strong experience or project when any exist (prefer both when relevant).
- Stacks: include those clearly relevant to the JD; exclude noise.

## Rewrites

### Experiences

- Keep `companyName` and `title` exactly as provided (do not rename employers/roles).
- `rewrittenBullets`: 2–5 bullets, impact-oriented, grounded. Empty array only if source evidence is empty and you set `include: false`.

### Projects

- Keep `name` as provided.
- `rewrittenSummary`: short tailored blurb.
- Optional `rewrittenBullets` when source text supports them.
- **Private `analysis` field:** internal signal for what to emphasize. **Never** print analysis as “Analysis:”, never quote it as a labeled section, never put “private analysis” into resume/cover/outreach text.

### Professional summary

- Optional tailored 2–4 sentence summary for the resume header area.
- Grounded in profile + selected evidence + job; no invented credentials.

### Stacks

- Pass through names; only set include true/false.

## Cover letter vs outreach email

| Artifact          | Tone                       | Length                                      |
| ----------------- | -------------------------- | ------------------------------------------- |
| `coverLetterBody` | Formal application letter  | ~3–5 short paragraphs; address company/role |
| `outreachSubject` | Professional email subject | One line; company + role when natural       |
| `outreachBody`    | Short recruiter outreach   | Brief (≈80–150 words); plain text; no HTML  |

- Cover: why this role, relevant proof points from **selected** evidence, polite close.
- Outreach: shorter than cover; ask for next step; do not paste the full cover letter.
- Do not invent recruiter names. Use generic greeting when name unknown.
- `proposedRecruiterEmail`: only if a plausible contact email appears in job/listing text; else `null`. Never invent emails.

## Job context output

Fill `jobContext` honestly:

- `title` / `companyName` from the job
- `descriptionUsed`: the description text you actually used (job description and/or listing page text)
- `listingFetched`: true if listing page text was provided and used
- `listingUrl`: listing URL when provided

## Notes

Optional short `notes` for the human reviewer (selection rationale, thin JD caveats). Not shown on PDFs.

## Output

Structured JSON only via the schema (`ApplyPackageDraft`). Include:

- `applicationId` from input
- `generatedAt` as ISO-8601 timestamp
- all required draft fields

No tools other than skill tools. Activate this skill before drafting.
