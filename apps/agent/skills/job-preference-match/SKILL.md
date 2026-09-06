---
name: job-preference-match
description: >
  Use when scoring harvested jobs against the seeker's job preferences
  and career profile (experiences, stacks, projects).
version: 1.4.0
tags:
  - mail
  - harvest
  - match
---

# Job preference match scoring

Score each harvested job 0–100 against the provided preference **columns** and
`SeekerProfileEvidence` when present. Search brief markdown is **narrative flavor
only**.

## Inputs

- Preference columns: workModes (array, multi-select), roleKeywords, salaryMin, salaryCurrency, minMatchScore
- Evidence (optional): roleTitles, organizations, featuredStackNames, stackNames, projectTitles
- Search brief (optional markdown): who I am / flavor. Never a hard stop.
- Jobs: title, company, location, description, workMode (single enum or null), salaryRange, listingUrl

## Column hard-fails (law)

These override judgment. If any fire, score low and `passed=false`. Brief prose cannot rescue them.

- **Salary floor:** hard fail only when stated pay converts to monthly in the **same currency** and is below `salaryMin`. Unknown pay, currency mismatch, or unparsable range is not a fail.

## Not a harvest / inbox hard-fail

- **Two-axis** (workModes + geography facets) is the **land / evaluate** gate only. Do **not** hard-fail harvest or inbox solely for unknown work mode or location.
- Unknown/null job workMode: **neutral**.

## Scoring guidance (ranking)

- **Role keywords:** strong boost when title/description aligns; mild penalty when orthogonal. Title fit beats description noise. Phrase identity applies (`react` ≠ `react native`).
- **Career profile (when roleKeywords are empty):** infer the seeker's craft from experience titles, featured stacks, and project stacks. A React/TypeScript frontend profile must **fail** nursing, sales SDR, graphic design, and other orthogonal roles. Generic words like "engineer" or "developer" are not a match by themselves.
- **Work modes (multi-select OR):**
  - `workModes` is an **array**. Empty `[]` means no work-mode filter (accept any).
  - Prefer **any** listed mode: if the job's `workMode` is one of the preferred modes, boost (e.g. prefs `["remote","hybrid"]` match both remote and hybrid jobs).
  - Soft-penalize only when the job has a **known** mode that is **none** of the preferred modes (e.g. onsite job vs `["remote","hybrid"]`).
  - Unknown/null job workMode: neutral — do not hard-fail solely for missing mode.
  - Never treat prefs as a single mode; never pick only `workModes[0]`.
- **Location:** ranking-neutral for harvest/inbox. Do **not** treat a location miss as a hard-fail.
- **Salary (ranking):** if both sides present and the job is clearly below min, that is already a column hard-fail. Otherwise do not invent FX conversions.
- **Search brief:** use only to color reasons / craft narrative. Never override a column hard-fail.

`passed` must be true only when `score >= minMatchScore`, no column hard-fail fired, and (when evidence exists and role keywords are empty) the job fits the seeker's craft.

Return a short `reasons` list per job (human-readable, not keyword dumps).
Mention multi preferred modes or matching stacks when relevant.
