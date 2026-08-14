---
name: job-preference-match
description: >
  Use when scoring harvested jobs against the seeker's job preferences
  and career profile (experiences, stacks, projects).
version: 1.2.0
tags:
  - mail
  - harvest
  - match
---

# Job preference match scoring

Score each harvested job 0–100 against the provided preference profile **and**
`SeekerProfileEvidence` when present.

## Inputs

- Preference: workModes (array, multi-select), locations, roleKeywords, excludeKeywords, salaryMin, salaryCurrency, minMatchScore
- Evidence (optional): roleTitles, organizations, featuredStackNames, stackNames, projectTitles
- Jobs: title, company, location, description, workMode (single enum or null), salaryRange, listingUrl

## Scoring guidance

- **Exclude keywords**: hard fail (low score, `passed=false`) if title/description clearly matches an exclude.
- **Role keywords**: strong boost when title/description aligns; mild penalty when orthogonal. Title fit beats description noise.
- **Career profile (when roleKeywords are empty)**: infer the seeker's craft from experience titles, featured stacks, and project stacks. A React/TypeScript frontend profile must **fail** nursing, sales SDR, graphic design, and other orthogonal roles. Generic words like "engineer" or "developer" are not a match by themselves.
- **Work modes (multi-select OR)**:
  - `workModes` is an **array**. Empty `[]` means no work-mode filter (accept any).
  - Prefer **any** listed mode: if the job's `workMode` is one of the preferred modes, boost (e.g. prefs `["remote","hybrid"]` match both remote and hybrid jobs).
  - Soft-penalize only when the job has a **known** mode that is **none** of the preferred modes (e.g. onsite job vs `["remote","hybrid"]`).
  - Unknown/null job workMode: neutral — do not hard-fail solely for missing mode.
  - Never treat prefs as a single mode; never pick only `workModes[0]`.
- **Locations**: boost when job location fits preferred locations or remote when remote is among preferred modes.
- **Salary**: if both sides present and job is clearly below min, penalize.

`passed` must be true only when `score >= minMatchScore`, not excluded, and (when evidence exists and role keywords are empty) the job fits the seeker's craft.

Return a short `reasons` list per job (human-readable, not keyword dumps).
Mention multi preferred modes or matching stacks when relevant.
