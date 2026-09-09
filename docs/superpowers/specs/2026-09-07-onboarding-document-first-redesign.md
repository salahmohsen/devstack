# Onboarding document-first redesign — design

**Date:** 2026-09-07
**Status:** Grill locked (session 2026-09-07; exploration pick + gap decisions). Ready for an implementation plan.
**Goal:** Rebuild the onboarding wizard as document-first (exploration Variant C): a live RenderCV-mirroring resume doc fills in as the user confirms their draft, AI provider connection becomes the gated first step, and every step's layout is polished per the better-ui principles.

**Related**

- [Exploration](../../../design-explorations/onboarding-flow.html) — 4 directions; **Variant C picked**
- [Manifest](../../../design-explorations/onboarding-flow.manifest.md) — data gaps, all resolved below
- [Brand record](../../../design-explorations/_brand.md) — chrome tokens
- [Education + certifications spec](./2026-09-07-education-certifications-resume-design.md) — sequenced dependency for the Education tick
- Current flow: `apps/web/src/pages/dashboard/onboarding/` (steps, shell, review) + `features/onboarding/` (session store, mutations)
- Skills: better-ui (polish details below), explore-design implement phase (parity diff on real data)

**Not this spec:** merging jobs + connect (rejected — they stay separate stops), completion % (rejected — section ticks instead), education/cert extraction (separate spec, sequenced), AI trial keys (none exist; BYO only).

---

## Grill-locked decisions

1. **Direction C — document-first.** A live resume document pane fills as the draft is confirmed.
2. **Section ticks, no % number.** Ticks mean "this section is on your resume." Missing sections render a quiet "Not on this resume — add anytime from the dashboard" — never a numeric score the user can't act on (rows are pre-selected, so a row-% would start at 100 and only fall; a section-% starts low for facts the user can't change).
3. **Preview fidelity: RenderCV-mirroring.** A shared preview component reuses the real RenderCV YAML→HTML mapping (`packages/pdf`), not a hand-waved summary card. The preview must not lie about the artifact.
4. **Jobs and connect stay separate steps.**
5. **AI becomes the gated first step** ("Connect your AI"), hard-gated on a successful provider probe; escape hatch exits to the dashboard with honest copy.
6. **Education tick is a sequenced follow-up** — ships when the education/certifications plan lands (no Education UI in this wave).
7. Settings scan result: **AI is the only settings surface missing from onboarding.** Profile/Integrations/Jobs are already covered; Smart rules/Notifications/Account/Domains/Invites/Shortcuts are refinement surfaces, not setup.

**Flow:** `Connect AI → Resume → Review → Jobs → Connect accounts → Done`

---

## Per-step design

### Step 1 — Connect AI (new, gated)

Single compact card (not the full settings page):

1. Provider select — featured providers first (OpenCode Go, OpenAI, Anthropic, DeepSeek, …), full catalog via search.
2. API key input — sealed server-side (same storage as Settings → AI).
3. Model — pre-filled with the provider's probe/default model; editable dropdown from catalog models.
4. **Test connection** → runs the existing `testAiProviderConnection` probe. Result inline: success (model + latency), or the existing error summarizer copy (billing / rejected key / model unavailable / network).
5. **Continue is disabled until a probe passes** for the current provider+key+model triple. State-enforced, not honor-system.
6. Escape hatch: "I'll do this later" → exits to the dashboard with copy: _"Resume import, the hub assistant, and job matching stay off until you connect a provider."_ Onboarding stays resumable (persisted-step restore already exists for the tail steps); the Resume step shows a disabled/inactive state pointing back to step 1 while no key exists.

This also kills today's raw AI-error-banner failure mode at Analyze for keyless users.

### Step 2 — Resume upload

Layout unchanged in structure (dropzone → ready row → Analyze). Changes:

- Copy already correct ("About three minutes…").
- With no AI config, the step renders in its inactive state (step-1 pointer) instead of enabling a doomed Analyze.
- Polish: press-scale on the dropzone/browse affordance; upload progress bar uses the exact `transition-property: scale, transform` rules (no `transition: all`); ready-row icon animates in with the standard icon cross-fade (opacity + scale 0.25→1 + blur 4→0, `cubic-bezier(0.2,0,0,1)`).

### Step 3 — Analyzing

Unchanged logic (detached job, leave-safe). Changes:

- The doc pane (right/left split with Review) can render here too: sections appear with a subtle "extracting…" skeleton as step labels stream — first moment the document-first metaphor pays off.
- Progress labels stay verbatim from the workflow steps.

### Step 4 — Review (the proof surface)

Two-pane on ≥`lg`: **doc pane left (sticky), confirm pane right**; single-column below `lg` (doc collapses to a compact top summary strip with section ticks + counts, expandable).

- **Doc pane:** RenderCV-mirroring preview of the _confirmed_ draft only. Each section header carries a tick: filled green when the section has confirmed content; missing sections (e.g. no projects in the CV) render "Not on this resume — add anytime from the dashboard" in muted text — designed placeholder, not a hole. Education section does **not** render in this wave (decision 6).
- **Confirm pane:** keeps the current tab model (Profile / Experiences / Projects / Stacks with count badges) — Variant C's confirm list is realized by keeping tabs but making each row's checkbox instantly reflect in the doc pane. No accordion-by-default; row edit inline expands (current behavior preserved).
- Every checkbox flip re-renders the corresponding doc section immediately (optimistic, no refetch).
- Warnings banner + apply/discard footer behavior unchanged; sticky footer shows "N of M rows selected · Source · file".
- Polish: row enter/exit uses subtle 6–8px translateY + fade (exits softer than enters); tab underline keeps existing transition; checkbox tick uses the established icon animation values; no stagger on keystroke-frequency updates (motion restraint — doc section re-render is instant color/opacity, ≤150ms).

### Step 5 — Jobs / Step 6 — Connect accounts

Separate stops (decision 4). Layout unchanged; polish only: the two-step tail keeps the numbered rail; each gets the standard enter animation (200ms fade-in, existing `OnboardingShell` behavior).

### Step 7 — Done

- Summary line (counts) unchanged.
- Gains the AI cross-sell **only if the user skipped step 1**: a single checklist card "Connect an AI provider — powers the hub assistant, mail classification, and apply packages" with inline provider+key+test form (same component as step 1, reused). If AI is configured, this card is absent.
- No jobs/connect checklist items (they're real steps upstream).

---

## Shared component: ResumeDocPreview

- New component (e.g. `apps/web/src/shared/resume-doc-preview/`) that consumes the **same section-mapping logic as `packages/pdf`'s `map-rendercv-yaml.ts`** — either by extracting the pure mapping into a shared package or by shipping a small `yaml → preview HTML` twin kept in lockstep with pdf tests. Contract: input = the confirmed draft shape (or portfolio-output shape), output = sectioned doc markup with per-section tick state.
- Section order mirrors the renderer: `summary → experience → (education later) → projects → skills → (certifications later)`.
- Used by: onboarding Review/Analyzing panes (this spec). Dashboard reuse is allowed later but not required now.
- Parity rule: preview must track the real renderer's section presence semantics — if the PDF wouldn't render a section, the preview shows the "not on this resume" state, and vice versa.

## State/session changes

- `OnboardingFlowStep` gains `"ai"` before `"upload"`; `ONBOARDING_DESTINATION_STEPS` grows to 5 destinations.
- Session store gains `aiConfigured` (probe ok + saved) to drive gating + done-step cross-sell.
- Persisted-step restore extended for the `ai` step.
- Backend: reuse existing ai-settings endpoints (save provider, test connection). No schema changes.

## better-ui detail lock (applies across steps)

- **Concentric radius:** doc pane inner cards use radius = pane radius − padding; dropzone inner radius follows same math.
- **Shadows for elevation, borders for structure:** doc pane elevation via layered shadow; structural borders only for pane dividers.
- **Icon states:** one icon set, `currentColor`, outline default; filled/ticked state only for confirmed sections.
- **Interruptible motion:** all interactive transitions are CSS (opacity/transform/filter, exact properties); the doc-section appear uses ≤150ms opacity/color; the one staged entrance allowed is the Analyzing → Review handoff (≤100ms stagger, runs once).
- **Motion restraint:** no custom animation on checkbox-toggle frequency interactions beyond the instant color/opacity swap; every animated state also has a static cue (tick color).
- **Reduced motion:** all new motion gated behind `motion-safe:` per existing shell conventions.

---

## Verification

- Parity diff (explore-design implement phase): extract Variant C reference HTML; screenshot loaded record (dense CV) vs sparse record (2 rows, no projects/summary) against the real implementation via the screenshot skill; drive deltas to zero; sparse record must read as designed (placeholder states carrying weight).
- Preview honesty test: for a draft, assert preview sections == sections the RenderCV pipeline would emit (unit-level, shared mapping tests).
- Gating tests: Continue disabled until probe ok; later-exit leaves resumable state; keyless upload step shows inactive state.
- `ai-feature-harness` after shipping (AI-gated first step + hub-adjacent behavior).

## Out of scope

- Completion % anywhere in onboarding (revisit as dashboard "profile completeness" later)
- Education/certifications in draft, doc pane, or Review tabs (sequenced to the education spec)
- Merged jobs+connect step; smart-rules/notification setup in onboarding; AI trial keys
