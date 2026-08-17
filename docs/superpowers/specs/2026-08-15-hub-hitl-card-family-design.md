# Hub HITL card family — Design

**Date:** 2026-08-15  
**Status:** Plan written  
**Plan:** `docs/superpowers/plans/2026-08-15-hub-hitl-card-family.md`  
**Goal:** One card grammar for every hub pause — existing JD / triage / package approval, and playbook extract / confirm / prefs / integrations / contact. Steal assistant-ui **approval / recommendation / elicitation / confirm** interactions. Compose with coss. Do not install the demo catalog.

**Related**

- Program map — `2026-08-15-product-program-map.md` (program **3c**)
- Hub HITL — `2026-08-11-hub-agent-tools-hitl-design.md` (hybrid resume; keep)
- Hub chat rebuild — `2026-08-13-hub-chat-assistant-ui-rebuild-design.md` (toolkit, not `present`)
- Playbook — `2026-08-15-hub-onboarding-playbook-design.md` (cards + resume handshake)
- Shared contracts — `2026-08-15-shared-integration-contracts-design.md` (catalog / AI cards)
- Skills: [assistant-ui](../../../.agents/skills/assistant-ui/SKILL.md), [tools](../../../.agents/skills/tools/SKILL.md) (`references/human-in-loop.md`), [primitives](../../../.agents/skills/primitives/SKILL.md), coss, impeccable (operate), [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md)

---

## Problem

Hub already pauses the run for the user. The chrome is three different layouts:

| Surface                                  | Today                                                          |
| ---------------------------------------- | -------------------------------------------------------------- |
| `propose-application-from-jd`            | Custom `ApplicationFromJdCard` (coss buttons, no shared frame) |
| `propose-new-jobs-triage`                | Custom `NewJobsTriageCard` (lists + checkboxes)                |
| `generate-apply-package` / send / accept | `AgentHubToolApproval` — warning Alert + **raw JSON args**     |
| Playbook cards (3b)                      | Not built; must not invent a fourth style                      |

assistant-ui Elements has the right _verbs_ (approval, recommendation, elicitation form, confirm dialog). The hotel / flight / weather demos are costumes. Installing them would fork our catalog, job-preference, and upload modules.

---

## Non-goals

- Assistant Cloud, thread list, user-managed MCP, voice, computer-use, terminal, code-diff
- Generative `present` tool / model-invented layout (already locked out in the rebuild spec)
- `"use generative"` compiler / `withAui()` / `aui()` Vite plugin — we already mount `defineToolkit` without it
- `humanTool()` / frontend `execute` as the HITL spine — Mastra `createTool` **without** `execute` stays
- Composer attachments, slash commands, mentions, canvas (later waves)
- Replacing playbook field modules (catalog, `JobPreferenceFields`, resume dropzone)
- Thumbs / feedback dialog (no sink yet)

---

## Product decisions

| #   | Decision                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **One frame, four kinds.** `HubHitlFrame` + `approval` \| `recommendation` \| `elicitation` \| `confirm`. New HITL tools pick a kind; they do not invent chrome.                                                                                                             |
| 2   | **Steal the interaction, not the demo.** Elements 62 / 63 / 30 / 118 are the grammar. Do not copy stay / weather / cart cards.                                                                                                                                               |
| 3   | **coss + existing modules inside the frame.** Buttons, Alert, Field, Checkbox from `@tsu-stack/ui`. Catalog / prefs / upload stay the page modules.                                                                                                                          |
| 4   | **Resume unchanged.** Client tools: `addResult` then `addToolOutput` (existing `shouldAutoResumeHubChat`). Server `requireToolApproval`: `respondToApproval` (and `addToolApprovalResponse` fallback). Playbook form tools: **no** `requireToolApproval` (playbook lock 10). |
| 5   | **Composer stays locked** while any pending HITL (`lastHubHitlKind !== null`). Attachments stay off. Resume PDF dropzone lives **on** the extract elicitation card.                                                                                                          |
| 6   | **Completed = one receipt line.** Keep today’s “You chose: …” / “Confirmed triage…” pattern. Do not leave a dead card in the thread.                                                                                                                                         |
| 7   | **Approval is not a JSON dump.** `generate-apply-package` / `accept-apply-package` / `send-apply-outreach` show a human summary (tool verb + application / recipient), not `JSON.stringify(args)`.                                                                           |
| 8   | **Recommendation is the default for “here is a change, pick.”** JD card and triage are recommendations, not approvals.                                                                                                                                                       |
| 9   | **Elicitation wraps a real form.** Prefs, AI bind-all, extract upload, profile contact. Fields come from the page, not a generic `args.fields` schema.                                                                                                                       |
| 10  | **Confirm is Yes/No only.** Send outreach, skip resume, cancel sibling triage. No extra fields.                                                                                                                                                                              |
| 11  | **Ship existing cards first.** Restyle JD, triage, package approval onto the frame. Playbook cards mount the same frame when 3b lands.                                                                                                                                       |
| 12  | **Follow-up chips after a receipt are P1.** After JD `package` → “Open application”. After extract apply → next playbook slice. Empty-state chips stay as they are until a later composer spec.                                                                              |

---

## Card kinds

```text
HubHitlFrame
  header: icon + title + optional status (“Waiting for you”)
  body:   kind-specific
  footer: primary / secondary / destructive (coss Button)
  live:   “Submitting…” while addToolOutput / approval in flight
```

| Kind               | Elements analog          | When                                                   | Footer                     |
| ------------------ | ------------------------ | ------------------------------------------------------ | -------------------------- |
| **Approval**       | Approval card (62)       | Side-effect tool gated by `requireToolApproval`        | Approve / Decline          |
| **Recommendation** | Recommendation card (63) | Model proposed a structured change; user picks among N | 2–3 named actions          |
| **Elicitation**    | Elicitation form (30)    | Need fields the model must not invent                  | Submit / Skip (if allowed) |
| **Confirm**        | Confirm dialog (118)     | Binary irreversible or skip                            | Yes / No (product labels)  |

`status.type === "requires-action"` **or** client-tool `input-available` with no result → pending frame.  
`status.type === "complete"` / result present → receipt, not the form.

---

## Mapping (existing + playbook)

| Tool                          | Kind                   | Body                                                                                 | Completes with                                                                          |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `propose-application-from-jd` | Recommendation         | Title, company, loc, match, clipped JD, listing link                                 | `{ action: package \| save \| dismiss }`                                                |
| `propose-new-jobs-triage`     | Recommendation         | Track / dismiss lists + checkboxes (keep current editor)                             | `{ action, trackIds, dismissIds }`                                                      |
| `generate-apply-package`      | Approval               | “Generate apply package for {title} at {company}” (resolve id client-side if needed) | `respondToApproval`                                                                     |
| `accept-apply-package`        | Approval               | What will be written (resume / letter labels)                                        | `respondToApproval`                                                                     |
| `send-apply-outreach`         | Confirm                | To / subject preview                                                                 | `respondToApproval` **or** confirm output — keep today’s approval path if already wired |
| `configure-integration`       | Elicitation            | **Same** catalog / AI card as Settings (`gmail` \| `resend` \| `github` \| `ai`)     | `{ ok, skipped?, configured }`                                                          |
| `extract-resume`              | Elicitation            | Dropzone + Analyze / Skip + optional slice mask                                      | `{ objectKey, filename, slice }` or `{ skipped }`                                       |
| `start-resume-extract`        | _(not HITL)_           | Long-job / pending tool UI (wave 2, not this spec)                                   | server execute                                                                          |
| `confirm-resume-apply`        | Recommendation         | Filename, counts, mask, warnings                                                     | `{ action: apply \| edit \| skip }`                                                     |
| `upsert-job-preferences`      | Elicitation            | Same `JobPreferenceFields`                                                           | `{ ok, skipped? }`                                                                      |
| `update-profile-contact`      | Elicitation or Confirm | Type + value; Confirm if the value is already filled                                 | `{ ok, type, value }` or `{ cancelled }`                                                |

Missing AI / Gmail / Resend / GitHub hard-gate uses **Elicitation** (`configure-integration`), not a generic error. Guardrail-notice (Elements 7) is optional copy on that frame (“Can’t extract until AI is configured”) — not a fifth kind.

---

## Assistant-ui / Mastra wiring

Keep the rebuild + HITL specs:

| Layer     | Rule                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mastra    | HITL = `createTool` **without** `execute`. Approval-gated = existing `requireToolApproval`.                                                                              |
| Toolkit   | `defineToolkit` + named `render` on `hubAssistantToolkit` (already). New cards are toolkit `render`s, not `makeAssistantToolUI` (deprecated in the local `tools` skill). |
| Resume    | `addResult` **and** `addToolOutput` (JD/triage already do both). Approval: `respondToApproval` first.                                                                    |
| Text hide | `hideHubAssistantTextAfterIndex` stays — pending card is the UI; no “awaiting your confirmation” prose.                                                                  |
| Composer  | Disabled when `lastHubHitlKind` is `approval` or `client`. Add playbook tool names to those sets in `hub-tool-names.ts` when 3b lands.                                   |

Do **not** adopt the skill’s generic `args.fields` form renderer. Playbook lock: same modules as the page.

---

## Visual / a11y

- Frame sits in the assistant column, `max-w` consistent with today’s cards (`max-w-3xl` approval, JD/triage current width — pick **one** width, apply to all).
- Pending: `role="alertdialog"` only for **Approval** and **Confirm**. Recommendation / elicitation are `role="region"` with a labelled heading (they are forms, not alerts).
- Focus the first control when the card mounts. Escape does **not** auto-decline (accidental decline of send/package is worse than a stuck card).
- Motion: opacity only; `prefers-reduced-motion`. No new animation system (program 2 still untitled).
- Dark island / surface: follow dashboard shell tokens. No second gray.

---

## File plan

| Path                                                              | Role                                          |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `apps/web/src/features/agent-hub/ui/hub-hitl-frame.tsx`           | Shared frame + kind styles                    |
| `apps/web/src/features/agent-hub/ui/agent-hub-tool-approval.tsx`  | Restyle onto Approval kind; drop JSON `<pre>` |
| `apps/web/src/features/agent-hub/ui/application-from-jd-card.tsx` | Recommendation kind                           |
| `apps/web/src/features/agent-hub/ui/new-jobs-triage-card.tsx`     | Recommendation kind                           |
| Playbook card files (3b)                                          | Mount the same frame                          |

No new `packages/ui` primitive until a second app needs the frame.

---

## Out of this spec (later waves)

| Wave | Elements                                                 | Notes                                             |
| ---- | -------------------------------------------------------- | ------------------------------------------------- |
| 2    | Long job (57), thinking indicator (2), tool failure (33) | `start-resume-extract`, detect/organize           |
| 3    | Spec sheet / table / score / comparison                  | Read tools (`get-application`, lists, matchScore) |
| 4    | Draft email (110), artifact / canvas                     | Mail reply + apply package document               |
| 5    | Slash, draft restore, @entity                            | Composer power                                    |

---

## Verification

After implement: [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md). Fresh report + `LESSONS.md`.

Must cover:

- JD card: package / save / dismiss still resume (`addToolOutput` + auto-send)
- Triage: confirm + sibling cancel still works
- Package approval: Approve / Decline without JSON; `respondToApproval` resumes
- Composer disabled while pending; re-enabled after receipt
- Existing receipt lines still replace the live card
- Mobile width: footer buttons wrap, no horizontal clip
- Playbook cards (when present) share the frame; catalog / prefs / dropzone still the page modules

---

## Implementation order

1. `HubHitlFrame` + restyle `AgentHubToolApproval` (highest visual debt).
2. JD + triage onto Recommendation.
3. Stop. Do not build playbook cards here — 3b owns those tools and mounts this frame.
