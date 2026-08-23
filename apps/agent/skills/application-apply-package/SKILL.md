---
name: application-apply-package
description: >
  Use when building a tailored apply package for one job application:
  light snapshot tweaks of portfolio experiences/projects for the role,
  then draft professional summary + cover letter + recruiter outreach email.
  Structured draft only; multi-step (chunked rewrites then letters).
version: 1.3.0
tags:
  - application
  - resume
  - cover-letter
  - outreach
---

# Application apply package

You produce a **reviewable apply package draft** for one job: tailored resume pieces
(all provided portfolio evidence rewritten for the role), formal cover letter, and short
outreach email. The seeker will edit before Accept.

Generation is **multi-step**. Each call is one phase; follow the phase rules for that call.

## Inputs you receive

- **Job brief**: title, company, description (and optional listing/notes when present)
- **Portfolio snapshot**: profile, contacts, experiences, projects, stacks
- Projects may include private **`analysis`** — use it only as rewrite signal (see below)
- Snapshot items are already the portfolio-opted-in set — **rewrite every item you are given**

## Core rules (non-negotiable)

1. **Rewrite all provided items.** Do not select a top-N subset or recommend excluding catalog items as the primary path. Every experience/project in the current phase input gets a grounded rewrite.
2. **Never invent** employers, job titles, project names, metrics, tools, or achievements that are not grounded in the provided portfolio (or private project analysis).
3. **Ids must match input.** Every `experienceId` / `projectId` / `stackId` must come from the portfolio snapshot (or the chunk you were given). Do not invent ids.
4. **Ground rewrites** in the item’s existing description/summary/bullets (+ private analysis for projects when present). Prefer stronger, clearer phrasing for the target role; do not fabricate scope.
5. **Return structured output only** (schema for this phase). No free-form essay outside the fields.

## Light tweaks, not a rewrite

- Reorder and **mirror JD phrasing where true**. Do not invent a second career.
- Keep facts. Numerals when the source already has a quantity.
- Dual acronyms when both forms are in the JD ∩ portfolio (e.g. Amazon Web Services (AWS)).
- Banned cluster unless already in the seeker’s text: leverage, synergy, utilize, spearheaded, results-driven, passionate, world-class, rockstar.
- **Punctuation:** never use em dashes (—), en dashes (–), or spaced double hyphens (`--`) as asides. Prefer a comma, period, colon, or parentheses. Compound words like `end-to-end` are fine.
- Prefer plain voice: is/are/has over "serves as" / "stands as" / "showcasing" filler.
- Do not clone the JD. Do not dump every listing keyword.
- `headline` is the **target role** line (fair title + optional years/scope). Do **not** rename past employers.
- Snapshot only: never ask to write these bullets back onto master experience/project/stack rows.
- **No user-facing ATS score**, Jobscan percent, or trophy. Optional `atsVendor` is a host guess for notes only.

## PDF include flag

- On the final draft, **all** experiences, projects, and stacks from the snapshot are `include: true`.
- The **server** sets `include` at assemble time. Models must **not** emit `include: false` and must not treat silent exclude as the product path.
- Page budget / auto-hide is an accept-path concern when Review apply kit is off — not a model decision.

## Phases

### Phase: experience rewrite (chunks)

- Input: a **chunk** of experiences (typically up to 3) plus job brief.
- Output: one rewrite per `experienceId` in the chunk — no extras, no omissions.
- Keep company/organization and title exactly as provided (do not rename employers/roles).
- `rewrittenBullets`: 2–5 impact-oriented bullets, grounded only in the item description (+ job fit).

### Phase: project rewrite (chunks)

- Input: a **chunk** of projects (typically up to 3) plus job brief.
- Output: one rewrite per `projectId` in the chunk — no extras, no omissions.
- Keep project name/title as provided.
- `rewrittenSummary`: short tailored blurb.
- Optional `rewrittenBullets` when source text supports them.
- **Private `analysis` field:** internal signal for what to emphasize. **Never** print analysis as “Analysis:”, never quote it as a labeled section, never put “private analysis” into resume/cover/outreach text.

### Phase: summary + letters

- Input: job brief, profile/contacts, **already rewritten** experiences/projects (not raw full portfolio walls), stack names.
- Output: `professionalSummary` (optional), `headline` (target role line), `coverLetterBody`, `outreachSubject`, `outreachBody`, `proposedRecruiterEmail`, optional `notes`, optional `jdBuckets` / `keywordDualForms` / `atsVendor`.
- Ground summary and letters only in profile + rewritten evidence + job — no invented credentials.
- Stacks: names only for context; server includes all snapshot stacks on the PDF.

## Cover letter vs outreach email

| Artifact          | Tone                       | Length                                      |
| ----------------- | -------------------------- | ------------------------------------------- |
| `coverLetterBody` | Formal application letter  | ~3–5 short paragraphs; address company/role |
| `outreachSubject` | Professional email subject | One line; company + role when natural       |
| `outreachBody`    | Short recruiter outreach   | Brief (≈80–150 words); plain text; no HTML  |

- Cover: why this role, relevant proof points from **rewritten** evidence, polite close.
- Outreach: shorter than cover; ask for next step; do not paste the full cover letter.
- Do not invent recruiter names. Use generic greeting when name unknown.
- `proposedRecruiterEmail`: only if a plausible contact email appears in the job/listing text; else `null`. Never invent emails.

## Notes

Optional short `notes` for the human reviewer (fit highlights, thin JD caveats). Not shown on PDFs. Not “selection rationale for exclude list.” Not an ATS score.

## Output

Structured JSON only via the **phase schema** for this call (chunk rewrite or summary+letters). The server grounds `jobContext`, sets `include: true`, and assembles the full draft.

No tools other than skill tools. Activate this skill before drafting or rewriting.
