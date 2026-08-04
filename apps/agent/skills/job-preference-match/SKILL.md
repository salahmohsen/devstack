---
name: job-preference-match
description: >
  Use when scoring harvested jobs against the seeker's job preferences
  (work mode, locations, role keywords, exclude keywords, salary, minMatchScore).
version: 1.0.0
tags:
  - mail
  - harvest
  - match
---

# Job preference match scoring

Score each harvested job 0–100 against the provided preference profile.

## Inputs

- Preference: workModes, locations, roleKeywords, excludeKeywords, salaryMin, salaryCurrency, minMatchScore
- Jobs: title, company, location, description, workMode, salaryRange, listingUrl

## Scoring guidance

- **Exclude keywords**: hard fail (low score, `passed=false`) if title/description clearly matches an exclude.
- **Role keywords**: strong boost when title/description aligns; mild penalty when orthogonal.
- **Work mode**: boost when job workMode matches preferred modes; soft penalty when conflicts (e.g. onsite-only vs remote-only prefs).
- **Locations**: boost when job location fits preferred locations or remote when remote preferred.
- **Salary**: if both sides present and job is clearly below min, penalize.

`passed` must be true only when `score >= minMatchScore` and not excluded.

Return a short `reasons` list per job (human-readable, not keyword dumps).
