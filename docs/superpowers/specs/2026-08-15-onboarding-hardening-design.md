# Onboarding hardening — Design

**Date:** 2026-08-15  
**Status:** Ready for plan (grill locked; spec review approved)  
**Goal:** Reliable first-run: optional AI, resume extract that keeps partial work, merge-safe re-import, shared Connect/Job preference modules, dual-layout review, celebration on Done.

**Related**

- Program map — `2026-08-15-product-program-map.md`
- Shared contracts — `2026-08-15-shared-integration-contracts-design.md`
- Wave 0 bugs — `../plans/2026-08-15-onboarding-extract-and-save-reset.md` (must ship first or in the same change)
- Owner onboarding — `2026-07-26-owner-onboarding-resume-import-design.md` (**supersedes** “experiences/projects always create” and tabbed review)

**Design skills (implementation)**

| Skill                  | Role                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **impeccable**         | Operate + onboard: first-run scanability, empty/partial/error                                                                  |
| **coss**               | Stepper host, review panes, forms, dialogs, Accordions on mobile cards                                                         |
| **transitions.dev**    | Step change (page side-by-side), panel reveal for desktop editor, Failed/Save text swap, success check on Done before confetti |
| **coss-particles**     | Prefer existing particles over new chrome                                                                                      |
| **ai-feature-harness** | Required after ship (resume extract, apply, AI step)                                                                           |

**UI kit adds (this spec only)**

- React Bits stepper (shoogle / reactbits) replacing `OnboardingStepIndicator`
- Magic UI confetti **side cannons** on Done
- beui range slider arrives via the **shared** job-preference form (spec 1)

Do **not** add jalco Diff Viewer, date wheel, shader background, or overflow-actions here.

---

## Problem

1. Production extract fails closed on string stacks and wipes the draft.
2. First-run assumes AI is already valid; analyze then dies.
3. Re-import **creates** every experience/project again (2026-07-26 rule).
4. Review is tabbed; you cannot see the whole draft. No new-vs-update.
5. Connect always shows, even when Gmail/GitHub are done; Resend is missing.
6. Jobs step already uses the shared form but is still labeled like a one-off.

---

## Product decisions (grill lock)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Steps: `ai? → upload → analyzing → review → jobs → connect? → done`                                                                                                                                                                                                                                                                                             |
| 2   | Omit `ai` when valid: ≥1 provider with a key **and** `resumeImport` bound to a live provider. Skip always allowed.                                                                                                                                                                                                                                              |
| 3   | Without AI: upload + skip-resume still work. **Analyze** disabled: link back to the AI step if it is in this run; otherwise **Settings → AI**.                                                                                                                                                                                                                  |
| 4   | First successful AI save on this step binds **all** features to that provider **and** sets every feature model to a **kind-matching** default (`pickProbeModelId(kind)`). Do not leave `deepseek/…` models bound to an OpenAI/Anthropic/etc. key. If `pickProbeModelId` is null (custom with no catalog model), they must pick a Default model before Continue. |
| 5   | Extract: coerce `string \| object` stacks; keep other sections; drop only bad items (Wave 0).                                                                                                                                                                                                                                                                   |
| 6   | Review desktop = grouped master-detail. Review phone = scrolling section cards. Two layouts.                                                                                                                                                                                                                                                                    |
| 7   | Desktop rail = one list: Profile, Experiences, Projects, Stacks. Not type tabs.                                                                                                                                                                                                                                                                                 |
| 8   | Re-import **match and merge**. Never delete existing evidence. Restart resets the wizard only.                                                                                                                                                                                                                                                                  |
| 9   | Job preferences: same `JobPreferenceFields`. Fill **empty fields only**. Auto: `roleKeywords`, `locations`. **Never** auto `workModes`, excludes, salary, or min score.                                                                                                                                                                                         |
| 10  | Connect uses the shared catalog (`hideConfigured`). Skip step if nothing to show.                                                                                                                                                                                                                                                                               |
| 11  | Soft onboarding stays (`onboardingCompletedAt`). No route lock.                                                                                                                                                                                                                                                                                                 |
| 12  | Done: side-cannons confetti once per completion of this session.                                                                                                                                                                                                                                                                                                |
| 13  | Settings copy **Job preferences**. Stepper = React Bits.                                                                                                                                                                                                                                                                                                        |

---

## Step machine

```text
[ai] optional
  skip / already valid
      ↓
[upload] PDF or Skip resume
      ↓
[analyzing] if Analyze
      ↓
[review] if draft
      ↓
[jobs] always (shared form)
      ↓
[connect] if any available catalog item unconfigured
      ↓
[done] confetti
```

`OnboardingFlowStep` adds `"ai"`. Destination indicator treats `ai` as its own mark; `upload`+`analyzing` stay one “Resume” mark.

**Reopen:** `onboarding.reopen` sets `onboardingCompletedAt = null`. Client `resetOnboardingSessionState()`. Does **not** delete profile, experiences, projects, stacks, prefs, or connections. Soft CTAs return. Apply still merge-safe.

Existing **Import from resume** (Profile settings) is the reopen CTA: if `onboardingCompletedAt` is set, call `reopen` then navigate. Do not add a second “restart onboarding” control this wave.

**Import another** on Done = new session then upload; review will show New/Update. Does not need `reopen` (they are already in the wizard).

OAuth return still restores `connect` via sessionStorage + `?step=connect`.

---

## AI step

Reuse Settings → AI provider configure + model binding, not a fork.

Valid (omit step):

```ts
providers.some((p) => p.hasApiKey) && liveProviderIds.has(modelProviderIds.resumeImport);
```

If a key exists but `resumeImport` is unbound, show the step and bind on save.

Every successful save on this step (not only the first click) rebinds all features. If they change provider before Continue, the latest save wins.

On each successful save from this step:

1. Persist the provider key (existing update path).
2. Set `modelProviderIds[feature] = thatProvider.id` for every `AI_FEATURES` entry.
3. Set `models[feature] = pickProbeModelId(kind)` for every feature (same id for all unless they later customize in Settings).
4. If step 3 is null, block Continue until they pick a Default model; then write that id to every feature.

Skip copy: they can upload now and analyze later, or skip resume and fill the profile by hand.

---

## Extract (Wave 0 + this spec)

Wave 0 owns coerce + no wipe. This spec consumes it.

Analyze stays a background job + toast (existing). Partial draft with warnings is a valid review: banner lists warnings; sections that landed are editable.

**No usable object** (Wave 0 `emptyExtract` only): stay on **analyzing**, retry + fix AI. Do not treat normalize’s fallback display name (`Owner` / existing user) as a real profile-only draft.

**Real profile-only extract:** resume had a name/summary/contacts and no jobs — go to review; EMPTY_DRAFT still allows profile-only Apply.

Signal: extract sets `meta.unusableExtract: true` (or warning code `extract:unusable`) when it used `emptyExtract`. **Thread that flag through normalize → format** so `ResumeImportDraftSchema` keeps it. Client keys off that, not “name length ≥ 2”.

---

## Review

### Shared data

Each draft row plus match metadata from `packages/core` helpers (same functions Apply uses):

| kind       | match key                                                          | badge                                                               |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| stack      | `name` case-insensitive                                            | New / Update / Unchanged                                            |
| experience | `normalize(organization) + normalize(title) + yearMonth(fromDate)` | New / Update / Unchanged                                            |
| project    | `normalize(title) + year`                                          | New / Update / Unchanged                                            |
| profile    | always the current user row                                        | Update / Unchanged (no import checkbox — profile is always applied) |

`yearMonth`: parse ISO-ish dates to `YYYY-MM`; `null` matches `null`.  
If two existing rows share a key, take the latest `updatedAt`.

Client match is display. **Apply rematches by key** on the server. Do not trust client `existingId` unless it still matches the key and is owned by the user.

Matched Update: patch fields the draft has; keep existing portfolio inclusion unless the user toggles.  
New: insert + portfolio default on.  
Existing not in draft: **leave alone**.

Import checkbox still gates Apply. Unchanged + selected is an idempotent update.

### Desktop (md+)

```text
┌──────── left rail ────────┬──────── right ─────────┐
│ Profile                   │ title + badge          │
│ Experiences               │ before/after (if match)│
│   • role · org     New    │ fields                 │
│   • role · org     Update │ portfolio switch       │
│ Projects                  │                        │
│ Stacks                    │                        │
└───────────────────────────┴────────────────────────┘
```

Rail rows: checkbox + title + subtitle + badge, except **Profile** (no checkbox). Click focuses the editor. Profile focused first.  
Before/after is a compact field diff (inspired by project diff cards), not a unified code diff.

### Phone

One scrolling column: Profile card (no import checkbox), then experience/project/stack cards (accordion expand to edit) with badges + checkbox. No two-pane.

### Partial / error

`AiErrorBanner` at top. Can Apply what is selected. Do not block review because stacks were coerced or empty.

---

## Apply (supersedes 2026-07-26 merge)

Keep one outer transaction, EMPTY_DRAFT, contact merge, stack upsert-by-name, `onboardingCompletedAt`.

Change:

4. Experiences: **update** matched selected rows; **insert** unmatched selected rows. Map `clientId` → id including updated rows.
5. Projects: same. Resolve `experienceId` + stacks.

Do not delete. Do not wipe portfolio entries for unmatched existing rows.

`CONTEXT.md` **Resume import** glossary: add match-and-merge (stacks by name; experiences by org+title+month; projects by title+year; never delete unmatched existing). It does not currently say “always create”; still write the new rule so agents do not follow 2026-07-26.

Apply summary (Done): `{ experiencesCreated, experiencesUpdated, projectsCreated, projectsUpdated, stacksCreated, stacksUpdated }` (or created+updated per kind). Re-import of the same resume must not look like a zero-count no-op.

---

## Job preferences step

Same `JobPreferenceFields` as Settings.

After a successful extract (entering jobs, or when leaving review), propose fills **only when the field is empty** on the saved row:

| Field                  | Source                                   |
| ---------------------- | ---------------------------------------- |
| `roleKeywords`         | Unique recent experience titles (cap ~8) |
| `locations`            | Profile location contact if present      |
| `workModes`            | **never auto**                           |
| `excludeKeywords`      | never auto                               |
| `salaryMin` / currency | never auto                               |
| `minMatchScore`        | never auto (default 60)                  |

Re-import does not overwrite a field they already saved. User can edit before Continue.

Helper lives in `packages/core` (or job-preference + onboarding) so tests do not sit in the page.

---

## Connect step

`<ConnectionsIntegrations hideConfigured callbackPath="…?step=connect" />`  
If the catalog helper says there is nothing to show, **do not mount** Connect; jobs Continue goes to Done.

Resend appears under **Emails** when the tenant has no key (spec 1).

---

## Done

Side-cannons confetti once when entering Done after Apply or Skip in this session (not on every remount). Respect `prefers-reduced-motion` (skip cannons).  
Keep “import another” and dashboard links.

---

## Stepper

Replace `OnboardingStepIndicator` with the React Bits stepper. Marks:

1. AI (if the step exists in this run; if omitted, hide the mark or show completed)
2. Resume (`upload` / `analyzing`)
3. Review
4. Job preferences
5. Connect (hide mark if step omitted)
6. Ready

If AI/Connect are omitted, the stepper has fewer marks — do not leave disabled mystery steps.

---

## Non-goals

- Date wheel, morphing tabs, overflow actions, testimonials
- Gmail on login
- Deleting evidence on re-import
- Binding only `resumeImport` (we bind all features)
- Implementing notification stacks / company logos

---

## Files (expected)

| Area            | Where                                                              |
| --------------- | ------------------------------------------------------------------ |
| Step + session  | `apps/web/src/features/onboarding/lib/onboarding-session-store.ts` |
| Page            | `apps/web/src/pages/dashboard/onboarding/`                         |
| Match helpers   | `packages/core/src/onboarding/`                                    |
| Prefill helpers | `packages/core/src/job-preference/` or `onboarding/`               |
| Apply merge     | `packages/db/src/repositories/onboarding-apply.repository.ts`      |
| Reopen          | `packages/api/src/routers/onboarding.router.ts`                    |
| Catalog         | spec 1 module; onboarding only consumes                            |
| Extract         | Wave 0 files                                                       |

---

## Testing + hardening

- Coerce stacks (Wave 0) + merge keys (two experiences same org/title/month; project title+year; stack name).
- Apply: update matched, insert new, leave unmatched existing.
- Prefill: empty vs already-saved keywords.
- Connect skip when catalog empty; show Resend when no tenant key.
- AI step omitted when valid; Analyze disabled when invalid.
- Desktop vs mobile review: not the same component tree; both can Apply.
- After implementation: **ai-feature-harness** on extract → review → apply → reopen → second import (no duplicates). Append lessons.

---

## Copy notes

| Surface          | Copy                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| AI skip          | Continue without AI. You can upload a resume and fill it in yourself, or add a provider to analyze automatically. |
| Analyze disabled | Add an AI provider to analyze this resume.                                                                        |
| Review partial   | Some sections did not finish. Review what is ready.                                                               |
| Update badge     | Already in your profile — we will update it, not add a second one.                                                |
| Reopen           | Run onboarding again. Your work stays; we will not create duplicates.                                             |
