# Match chips: canonicalize listing skills, silent same-skill link, in-panel create

**Date:** 2026-08-23  
**Status:** Locked for implementation (PO accepted 2026-08-23). Ready for an implementation plan.  
**Goal:** Inspect Match chips and `%` only count checkable tools. Role phrases leave the bar. Same-skill tokens link to the catalog without a picker. Create skill from “I have it” stays in the side panel on this job.  
**Surfaces:** New jobs inspect, Tracked inspect, land leftover extract, regenerate take, Skills form (hosted from inspect)  
**Verification skill:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) after implement (take + inspect Match). Lessons in that skill’s `LESSONS.md`.  
**Glossary:** [CONTEXT.md](../../../CONTEXT.md) — [Skill alias](../../../CONTEXT.md), [Close skill](../../../CONTEXT.md), [Agent take](../../../CONTEXT.md)  
**Research:** [Job requirement match against user data](../../research/2026-08-22-job-requirement-match-against-user-data.md)

**Related**

- [Hub job context](./2026-08-22-hub-job-context-design.md) — this spec **amends** frozen **#17** and **#18** (phrase chips, `%` denominator, dashboard create-skill). Other hub-job-context rows stay locked.
- [Jobs hardening from Freehire](./2026-08-20-devhub-jobs-hardening-from-freehire-design.md)
- ADR [0025](../../adr/0025-entity-form-sheet.md) — inspect chrome; this spec adds **push/pop** on that chrome, not a second overlay language.

**Does not reopen.** Grill lock for this amendment. Implementation may refine file names, not the frozen table.

**Not this spec:** merging inspect `%` with `application.matchScore`; a create-and-assign-to-job RPC; Lightcast/ESCO; LLM on the chip bar; counting Close as Have; auto-creating stacks; writing seeker skills onto `requiredSkills`; hub Confirm for dashboard “I have it”; a full side-panel router for every page.

---

## 1. Goal

The Match ticker is Have / checkable listing tools. Leftover extract must not store duty sentences as skills. The take already explains role fit in prose. Chips stay a dictionary.

---

## 2. Frozen decisions

| #   | Topic             | Decision                                                                                                                                                                                                                                                                                                         |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Detector          | **Allowlist.** A token is a skill if `canonicalizeListingSkillToken` hits. Unknowns are dropped from chips and from `%`. Not “has a space.” `Tailwind CSS` stays; `frontend development` does not.                                                                                                               |
| 2   | Allowlist members | Tenant catalog **name + aliases**, `parseCanonicalStackNames()`, `CANONICAL_SKILL_ALIASES`, `WEB_FUNDAMENTAL_SKILL_NAMES`, plus frozen **extra JD tools** (§4). Adding a tool is a core list edit, not an LLM guess.                                                                                             |
| 3   | Duty backup       | After a miss: drop if the token looks like a duty (§4). Hits on the allowlist **win** even if the name looks like a duty (`test driven development` if we later alias it to TDD).                                                                                                                                |
| 4   | `%`               | `round(100 * Have / checkableTokens)`. Checkable = tokens that survived canonicalize. Close still does not count. No checkable tokens → hide the bar (`percent: null`), not 0%. **Amends** hub-job-context #16/#17 “listed tokens” to **checkable** tokens.                                                      |
| 5   | Persist           | Land / leftover merge / refresh-from-URL **write** the cleaned `requiredSkills` / `preferredSkills`. Inspect **also** runs canonicalize on read so old rows fix without a migration.                                                                                                                             |
| 6   | Silent same-skill | `resolveJobSkillTags` sets `stackId` on a **unique** hit: exact name, exact tenant alias, or unique `CANONICAL_SKILL_ALIASES` row. Same preselect rule as “I have it” (`Java` ↛ `JavaScript`). **Does not** append aliases. **Does not** create stacks.                                                          |
| 7   | Take              | Pass `{ have, close, missing, percent }` into take generation. Model must not recompute chips or invent skills. Role phrases may appear in a bullet only if held tools support that role. Dropped tokens are not Missing.                                                                                        |
| 8   | `matchScore`      | Unchanged. Prefs AI + years cap. Not the Match ticker.                                                                                                                                                                                                                                                           |
| 9   | “I have it”       | Missing **checkable** tool: alias picker **plus** Create skill. Create **pushes** `StackForm` in this panel (page stays). Save pops back to the **same** job inspect; invalidate stacks + application. Close / dropped phrases: no create. Empty catalog: Create skill (not hub interview) for a checkable tool. |
| 10  | Create write      | Existing `stacks.create`. Prefill name with the listing token. If the saved name differs from the token, add the token as an alias when it is not already name/alias. No new RPC. Do not PATCH listing skills.                                                                                                   |
| 11  | Panel stack       | Small push/pop on the dashboard side panel (ADR 0025 chrome). Job inspect → form → back. Dirty close still confirms. Reuse later from other inspects; this spec only ships the job → skill-form path.                                                                                                            |
| 12  | Hub               | Hub “I have it” create-skill Confirm (hub-job-context PR 3) is **not** the dashboard path. Dashboard does not call `requestHubCreateSkillFromInspect` for empty catalog.                                                                                                                                         |

---

## 3. Current pain

Leftover BYO extract (`needsLeftoverByoExtract` when skills ≤ 1) writes Requirements prose into `required` / `preferred`. `resolveJobSkillTags` only matches exact catalog **names**. `classifyJobSkills` then treats `frontend development` as Missing. `%` is 3/10. The take already says the role fits. Two stories fight.

`extractSkillMentions` was already dict-only. Leftover extract bypassed it.

---

## 4. Canonicalize (core)

Pure functions in `@tsu-stack/core` next to `job-skills.ts` / `skill-match.ts`. Land, leftover merge, inspect, and tests all call the same helpers.

```ts
export function canonicalizeListingSkillToken(
  token: string,
  held: readonly { name: string; aliases?: readonly string[] }[]
): { keep: true; display: string } | { keep: false };
```

**Hit (keep)** if `normalizeJobSkillName(token)` equals any of:

1. A held `name` or `alias`
2. A `parseCanonicalStackNames()` entry
3. A `CANONICAL_SKILL_ALIASES` canonical or extra
4. `WEB_FUNDAMENTAL_SKILL_NAMES`
5. `EXTRA_JD_TOOL_SKILLS` (frozen nucleus below)

Longest alias wins, same as `buildJobSkillMentionPatterns`. Display is the canonical/held spelling when the table has one; otherwise the listing spelling (trim, max 80).

**Miss:** `{ keep: false }`. Then duty backup may still drop (already a miss). Do not keep a miss because it is a single word.

**Duty backup** (only on miss): drop when any of:

- three or more whitespace-separated words (`api building and testing`)
- matches `/\b(development|design|skills)\b/i` as a whole word in a **multi-word** token (`frontend development`, `ui/ux design`)
- matches `/\bbuilding and\b/i`

Single-word misses (`cobol` not in the list) are also dropped from chips. Unknown tools the seeker actually uses get onto the bar via catalog create or by adding them to `EXTRA_JD_TOOL_SKILLS`.

**Frozen extra JD tools** (display names; match case-insensitively):

`AWS`, `GCP`, `Azure`, `HTTP`, `REST`, `GraphQL`, `Docker`, `Kubernetes`, `Postman`, `Git`, `GitHub`, `GitLab`, `CI/CD`, `Linux`, `SQL`

`Redis` / `MongoDB` / `PostgreSQL` already live in canonical stack names. Do not duplicate. Grow this list only in core, with a unit test per addition.

**`canonicalizeListingSkillNames(tokens, held)`:** map keepers, dedupe by normalized display, preserve first-seen order, keep required vs preferred split at the caller.

**`resolveJobSkillTags`:** after canonicalize, set `stackId` from unique `preselectHeldSkillForAlias(token, heldWithIds)`. Collision or empty → `stackId: null`. Still never creates a stack.

---

## 5. Where it runs

| Path                                                                | Change                                                                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mergeLeftoverExtract` / land `resolveSkillsForUser`                | Canonicalize required/preferred **before** persist                                                                                                                                        |
| Hub paste / `linkJobSkillsForUser` / refresh-from-URL               | Same                                                                                                                                                                                      |
| Inspect `listingSkillNames`                                         | Canonicalize on read (old rows)                                                                                                                                                           |
| `classifyJobSkills`                                                 | Input is already checkable; `%` uses that length. Delete the test that expects `frontend development` in `missing[]`; assert it is absent from have/close/missing and does not affect `%` |
| Take prompt (`generate-agent-take` + `job-agent-take` instructions) | Include classified chips. “Do not list dropped phrases as missing skills. Do not invent tools.”                                                                                           |

No DB migration. No change to `application.matchScore` or years cap.

---

## 6. Inspect “I have it”

On a **Missing** checkable chip:

1. Alias picker as today (required pick to write an alias).
2. Footer / extra action: **Create skill**. Pushes `StackForm` with `name` seeded to the token. Route stays. Job inspect is the stack base.
3. Save → `stacks.create` → optional alias if saved name ≠ token → pop → invalidate stacks + `applications.get` + lists. Chip should move to Have.
4. Cancel / dirty discard → pop to the same job. No write.

Close chips: toast, no create (hub-job-context #18).

Empty catalog + checkable missing token: skip the picker, push Create skill.

Do not `requestHubCreateSkillFromInspect` on this dashboard path.

---

## 7. Panel push/pop

ADR 0025 already hosts forms in the inspect chrome. Today a form **replaces** inspect. This spec needs a **stack**:

1. Job inspect open (`applicationId` remembered).
2. Push skill form (same `ItemInfoPanel` / inset Sheet).
3. Pop restores that inspect.

Dirty close on the form still uses the existing discard dialog. Escape pops one frame, not the whole panel, when the form is on top.

v1 host: jobs inspect + `StackForm` only. API should be a small module other pages can call later (`push` / `pop` / `peek`). Do not rebuild dashboard routing.

---

## 8. Testing

Core unit:

- Keep: `React`, `React.js` → React, `Tailwind CSS`, `Postman`, `HTTP`, `CI/CD`
- Drop: `frontend development`, `ui/ux design`, `responsive ui`, `accessibility` unless it is a held name/alias (held **accessibility** / `a11y` stays), `api building and testing`, `strong communication skills`
- `%`: 3 tools Have of 5 checkable = 60; two dropped phrases ignored
- `Java` does not `stackId`-link to `JavaScript`
- Unique `React.js` links to held React `stackId`
- Duty backup does not drop an allowlisted multi-word name

Web: alias picker still requires a pick; Create skill does not write until save.

No e2e unless asked. After implement: [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) on inspect Match + regenerate take.

---

## 9. Rollout

No flag. One PR (or a short stack: core canonicalize → land/inspect wire → take prompt → panel create). Revert restores leftover-extract chips.

---

## 10. Success

- That screenshot’s bar no longer lists `frontend development` / `ui/ux design` / `api building and testing`.
- `postman` / `http` stay Missing until alias or create.
- `%` is Have / remaining tools.
- Take can still say the role is frontend if React/JS/TS are Have.
- Create skill from Missing returns to the same job with the new chip in Have.
