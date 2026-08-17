# Job preference two-axis matching + extraction — Design

**Date:** 2026-08-15  
**Status:** Accepted (grilled lock; ready for implementation plan)  
**Goal:** New jobs only keep listings that match the seeker’s work mode + hiring region, with truthful Details (mode, employment, skills) and an agent take **before** the card appears.

**Hardening:** After implementation, **wipe this tenant’s discovery rows**, then run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md). Fresh report + lessons. Do not claim done on a polluted inbox from the land-then-AI era.

**Amends:** [Job discovery adapters](./2026-08-14-job-discovery-adapters-design.md) — **supersedes** cheap location/work-mode rank, land-then-AI insert, and “fill/fix after stub.” Ingest, adapters, catalog, N slider, 50-cap, 2×N, TTL, Scan gate, no communal LLM are unchanged.

**Related:** discovery spec; [New jobs + Tracked](./2026-08-11-new-jobs-tracked-jobs-design.md).

**Superseded (remote branch only, 2026-08-16):** [Search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md) owns remote overlap. `locations` stay onsite/hybrid places. Remote uses `remoteRegions` (empty = worldwide). Do not treat user `worldwide` on `locations` as a hybrid pass. **Land still drops unknown mode** (this file’s grill **#9**). Remote + unknown listing region is worldwide **only when `remoteRegions` is empty**; non-empty `remoteRegions` + unknown region = **drop** (this file’s grill **#2** does **not** apply unchanged). Cheap / harvest / hub preview still do not run two-axis. Do not rewrite the rest of this grill.

---

## Problem

1. Settings already has **Locations** and **Work modes**, but cheap score only ±ranks. A `Remote · LatAm` Ashby job landed at 100% for Egypt/KSA + Hybrid.
2. Details omit work mode. Employment stays `Unknown`. Ashby already sent `workplaceType=Remote`, `employmentType=FullTime`, `location=LatAm`.
3. Hydrate writes **description** only and drops JSON-LD mode/employment.
4. Inbox-AI runs **after** insert, so New jobs shows stubs (“No agent take yet”) and junk occupies the 50-cap.
5. No first-class skills on the application → no “most needed stacks I don’t have.”

---

## Frozen decisions (grill)

| #   | Topic                        | Decision                                                                                                                                                                                                                   |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Remote + location            | **Two-axis.** On-site/hybrid must match a preferred **place**. Remote lands only if Remote is selected **and** hiring region overlaps (Egypt, KSA, MENA, EMEA, worldwide). `Remote · LatAm` / `Remote · US only` stay out. |
| 2   | Unknown after $0 extract     | **Do not land.** Remote + **no** region → treat as **worldwide**.                                                                                                                                                          |
| 3   | Extract stack                | Adapter ATS fields → HTTP/JSON-LD → dictionaries → **last-resort AI** only if still missing.                                                                                                                               |
| 4   | Field pack                   | Application gets `workMode`, `hiringRegion`, required/preferred `skills`. Fill `employmentType`. No visa/timezone/department in this wave.                                                                                 |
| 5   | Stack identity               | Resolve names to **this tenant’s** stack catalog ids. Unmatched stay `{ name, stackId: null }` **on the job only**. Do **not** auto-create stacks.                                                                         |
| 6   | Study list                   | Unlinked **required** skills = “most needed I don’t have.” Preferred is chips/stats only.                                                                                                                                  |
| 7   | AI timing                    | **One** inbox-AI attempt **before** insert: extract if needed → two-axis → score → take → insert keeper. No second 2×N tick.                                                                                               |
| 8   | Score fail                   | Insert **Dismissed** (`via: low_match`). No take.                                                                                                                                                                          |
| 9   | Two-axis / unknown-mode fail | **Drop.** No row.                                                                                                                                                                                                          |
| 10  | Take fail                    | Insert keeper anyway; “Generate take” remains.                                                                                                                                                                             |
| 11  | Catalog                      | ATS/HTTP only. **Never** write AI guesses onto `job_posting`.                                                                                                                                                              |
| 12  | Work mode UI                 | Selected mode shows a **check** (or equivalent) next to the label.                                                                                                                                                         |
| 13  | Profile fit                  | AI scorer already uses experience/stacks/projects. Cheap land stays title + exclude + two-axis. **Do not** reject because the seeker lacks a required skill.                                                               |
| 14  | Reset + harden               | Plan **must** wipe this tenant’s discovery applications + AI budget, then a fresh hardening loop on an empty inbox.                                                                                                        |

---

## Two-axis matching

User prefs: `workModes` (OR) + `locations` (free strings: `egypt`, `saudi arabia`, cities).

Listing after extract:

- `workMode`: `remote` \| `hybrid` \| `onsite` \| unknown
- `hiringRegion`: normalized slug (below) or unknown
- `location`: display string (city / “LatAm” / “Remote”)

**Hard filter** (before insert, after extract):

```
if workMode is unknown → drop
if user.workModes is non-empty and not “all three”:
  if listing.workMode not in user.workModes → drop
if listing.workMode is onsite or hybrid:
  if user.locations is empty → drop (need a place)
  if listing place does not overlap user.locations → drop
if listing.workMode is remote:
  if user did not select remote → drop
  if hiringRegion is unknown → treat as worldwide (pass)
  else if hiringRegion does not overlap user.locations / derived regions → drop
```

“All three work modes” = no mode filter (same as empty). Locations still apply to on-site/hybrid.

**Overlap:** user location tokens map to countries + regions (see taxonomy). Listing `hiringRegion` or parsed `location` must share a country or an ancestor region with the user. `worldwide` overlaps everyone.

Cheap score **no longer** ±15/±10 for mode/location. Those are kills here. Cheap still: exclude kill, title-keyword required, rank bonuses for title/skills.

---

## Hiring region taxonomy

Slugs (closed):

`worldwide` | `mena` | `emea` | `eu` | `uk` | `us` | `latam` | `africa` | `apac` | plus ISO-ish country keys used in overlap (`egypt`, `saudi_arabia`, `de`, `br`, …).

Synonyms (dictionaries, $0):

| Raw                                           | Slug                             |
| --------------------------------------------- | -------------------------------- |
| worldwide, anywhere, remote worldwide, global | `worldwide`                      |
| latam, latin america, lat-am                  | `latam`                          |
| mena, middle east, gcc                        | `mena`                           |
| egypt, eg, cairo                              | `egypt` → ancestor `mena`        |
| saudi, ksa, riyadh                            | `saudi_arabia` → ancestor `mena` |
| emea                                          | `emea` (includes mena + eu)      |
| eu, europe, remote — eu                       | `eu`                             |
| united states, usa, us only, remote us        | `us`                             |

User pref `egypt` overlaps listing `egypt` or `mena` or `emea` or `worldwide`. It does **not** overlap `latam` or `us`.

Ashby `location: LatAm` + `workplaceType: Remote` → `workMode=remote`, `hiringRegion=latam`.

---

## Extract pipeline ($0 then AI)

**Layer 1 — adapter (catalog, shared, $0)**  
Map official fields when present:

- Ashby / freehire ATS: `workplaceType` / `work_mode`, `isRemote`, `employmentType`, `location`, `skills`, `address.addressCountry`
- Himalayas / Remotive / RemoteOK / Arbeitnow: existing remote flags

Write `workMode`, `location`, `skills`, and **new catalog** `hiringRegion` + `employmentType` only when the **source stated** them. Do not infer on the catalog from JD prose.

**Layer 2 — hydrate HTML + JSON-LD (catalog, shared, $0)**  
Today hydrate persists **description only**. Also persist when JSON-LD/ATS walk finds them: `jobLocationType=TELECOMMUTE` → remote, `employmentType`, `applicantLocationRequirements` → hiringRegion, `skills`. Still no LLM. Prefer longer JD as today.

**Layer 3 — dictionaries (evaluate, $0, not written to catalog if guessed)**  
On the **candidate** (in-memory / later application): `\bremote\b`, hybrid, on-site; “100% remote”; Full-time / Contract. Region synonyms table.

**Layer 4 — last-resort BYO (application path only)**  
Only if `workMode` still unknown **or** required-skills list empty/thin **or** employment unknown. Same inbox-AI attempt as score+take. Structured output: workMode, hiringRegion, employmentType, `required[]`, `preferred[]`. Never PATCH `job_posting`.

---

## Skills on the application

```ts
type JobSkillTag = {
  name: string;
  stackId: string | null; // this tenant’s stack id, else null
  band: "required" | "preferred";
};
```

Persist `requiredSkills` + `preferredSkills` jsonb on `application` (or one jsonb with `band`).

Resolve `name` against the user’s stacks (normalized name / aliases, same spirit as detect-stacks families). Hit → `stackId`. Miss → `stackId: null`, **do not** insert a stack.

UI: Details chips. Later stats: count `name` / `stackId` across inbox+tracked; “to study” = required with `stackId == null`.

---

## Evaluate-then-insert (replaces land-stub → inbox-AI)

HTTP Find now / cron **still only enqueue**. Never await the model.

```text
cheap shortlist (title + exclude only; no mode ±rank)
→ HTTP hydrate (desc + structured JSON-LD)
→ $0 two-axis (layers 1–3)
    fail → drop (no row)
    unknown workMode after $0 → drop (no row)  [AI does not unblock]
→ if BYO key: one attempt
    extract leftover (skills / employment; mode only if we already have it and are polishing)
    score (minMatchScore)
    fail → insert dismissed, via low_match, no take, backfill evaluate
    pass → take (soft-fail ok) → insert inbox with mode, region, skills, score, take
→ if no key: insert inbox from $0 fields, cheap matchScore, no take
```

**Clarification vs grill Q9-C:** AI **does not** invent work mode to un-skip a drop. Mode/region at the land gate are $0 only (adapters + JSON-LD + dictionaries). AI in the same pass fills **skills / employment** (and copies mode onto the application if catalog already had it) plus score + take **after** $0 two-axis passed.

If grill C is read as “AI extract can unblock unknown mode,” that is **rejected** here: it would re-land junk when JSON-LD is empty and the model guesses Remote. Unknown mode after $0 → drop. Fix adapters/hydrate so Ashby never stays unknown.

**N** = inbox keepers this run (AI-passed, or cheap-passed if no key). In-flight evaluate jobs are **not** inbox rows. Size the evaluate pool with `min(N - passedThisRun, 50 - openInbox, remainingAttempts)`.

**50-cap** counts `trackingStatus=inbox` only (no pending stubs).

**2×N** increments once per evaluate that called the agent (extract and/or score and/or take). Score-fail still increments. Two-axis $0 drop does **not** increment.

Backfill: on dismiss, enqueue another evaluate for this `runId` (same as today’s land retrigger).

---

## UI

- Settings work modes: selected segment shows a **check icon** + existing pressed style.
- Settings locations copy: on-site/hybrid must match these places; Remote uses hiring-region overlap (MENA/worldwide), not “any remote on earth.”
- New jobs Details: Work mode, Location, Hiring region (if useful), Employment, Salary, required/preferred skill chips, take already filled on keepers.
- Find now toast: do not claim “done” while evaluate is running; keepers appear as finished cards.

---

## Reset + hardening (required)

Before claiming the new flow works:

1. Wipe **this tenant** (`salah` / session user): discovery `application` rows (inbox + dismissed with `sourceTags` including `discovery`) + their activity; `user_job_ai_budget` for that user. Do **not** wipe other tenants, mail, or the shared `job_posting` shelf (Find now will ingest/evaluate against the catalog).
2. Confirm prefs: title pack, work modes, locations, N, minMatchScore, importFromEmail off.
3. Find jobs now → only two-axis survivors in New jobs; score fails only in Dismissed; take present on keepers; Details show Remote on Ashby remotes; LatAm remote must **not** appear if locations are Egypt/KSA and region is `latam`.
4. ai-feature-harness report + `LESSONS.md`.

---

## Non-goals

- First-party Ashby/Greenhouse adapters (freehire + hydrate must map those fields).
- Visa, timezone, seniority, department columns.
- Auto-creating stacks from jobs.
- Communal LLM on `job_posting`.
- Changing N range, 50-cap, TTL, Scan gate, adapter set.

---

## Test contract (core)

- Two-axis: hybrid+Egypt drops `remote+latam`; remote+Egypt keeps `remote+mena` and `remote+worldwide`; remote+Egypt drops `remote+us`; unknown mode drops.
- Region synonyms: “LatAm” → `latam`; “cairo” overlaps `egypt`/`mena`.
- Skill resolve: “React” → user’s React `stackId`; “Katalon” → `stackId: null`.
- Cheap score: no longer passes a title hit with the wrong mode.
