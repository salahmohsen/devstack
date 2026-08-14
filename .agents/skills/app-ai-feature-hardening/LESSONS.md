# Living lessons

**Agents:** Read this file at the start of every `app-ai-feature-hardening` run.  
**After every run:** prepend a new entry (newest first) using the template.  
**Style:** Durable and generic — another agent next month should benefit. No secrets, no one-off repo names unless the lesson is about that product surface.

## Entry template

```markdown
## YYYY-MM-DD — short title

- **Trigger:** what was under test
- **Finding:** reusable rule
- **User preference:** (optional)
- **Evidence class:** API / SSE step / UI dialog / DB state
```

---

## 2026-08-14 — Onboarding skip must not skip first value

- **Trigger:** Redesign onboarding to add Jobs + Connect after resume review
- **Finding:** A Skip on the first step that calls `onboarding.skip` marks the product complete and hides the hub CTA — users never set prefs or connect Gmail. Skip-resume should only advance; mark complete on the last step
- **Finding:** Analyze is a wait state, not a destination. Counting it as a numbered step inflates the stepper and hides the real actions (review, prefs, connect)
- **Finding:** Integration OAuth callbacks hardcoded to Settings drop the onboarding session. Shared cards need a `callbackPath`, and Connect must persist `?step=connect` (sessionStorage is not enough if the tab full-reloads)
- **User preference:** Integration cards on onboarding must match Settings → Integrations
- **Evidence class:** Shared `ConnectionsIntegrations` used by both surfaces; onboarding route search schema

## 2026-08-14 — New jobs match prefs + profile; classify must not false-stamp

- **Trigger:** Reset Career Inbox jobs/labels and harden harvest + hub for everyday language
- **Finding:** `isOpenJobPreference` + `openPrefs ? true` dumps every harvested listing into New jobs. When the seeker has experiences/stacks/projects, require a profile fit even if role keywords are empty
- **Finding:** Role-keyword title miss must stay a hard fail when prefs are closed (a nurse listing that mentions React in the body must not pass)
- **Finding:** If classify AI is down and you still `applyClassification` with empty labels, `classifiedAt` blocks retry. Leave unclassified, or persist only a heuristic/digest label
- **Finding:** `noreply@linkedin.com` with a `\b` word boundary matches `messaging-digest-noreply@linkedin.com` (hyphen is a boundary). Digest sender checks must match the full local-part, not a suffix
- **Finding:** Rebuilding `@tsu-stack/core` cache while `mastra dev` is bundling can crash the agent (`export named X` race) and leave Studio/4111 down until a clean restart
- **User preference:** Hub should understand everyday wording (emails, jobs that came in, skills I use) without requiring product names
- **Evidence class:** Core unit matrix (score + classify fixtures); DB reset of applications/mail; live classify logs (`guard:job_alert_digest`, `heuristic_fallback`); agent :4111 down this session so harvest create was not re-run

## 2026-08-14 — Theme both appearances when reviewing public UI

- **Trigger:** Public profile summary + repo side panel review after a batch of visual changes
- **Finding:** `shimmer` + `shimmer-once` keeps `-webkit-text-fill-color: transparent` after the sweep. In light mode the leftover gradient reads as ~30% opacity muted text. After a one-shot shimmer, restore solid `currentColor` (or drop the utility)
- **Finding:** Review light and dark on the same surface; a dark-only pass missed the unreadable summary
- **Finding:** Four identical “View all” links in one panel fail “links describe destination” — include the section name in the visible label
- **User preference:** Test every UI change in light and dark, and treat visual quality as part of done
- **Evidence class:** Browser screenshots of `/salah` and `/salah/repos/cilas` in both appearances; mobile 390px profile

## 2026-08-14 — No prose after hub HITL confirmation cards

- **Trigger:** New jobs triage card was followed by “Triage proposal ready — awaiting your confirmation.”
- **Finding:** Client HITL tools have no `execute`. If `onIterationComplete` continues whenever `toolCalls.length > 0`, the next step (often last-step `toolChoice: "none"` + “summarize”) writes wrap-up text after the card
- **Finding:** Last-step “Summarize what you have found” must not run while a confirmation card is still waiting
- **Finding:** Prompt alone is not enough — hide assistant text parts after a pending client HITL tool in the hub thread. Keep auto-resume for premature “awaiting confirmation” copy so Confirm still continues
- **User preference:** The confirmation card is the UI; do not add text after it
- **Evidence class:** Unit matrix on hide-after-index + loop-stop policy; hub thread render filter

## 2026-08-14 — Organize auto-selects featured profile stacks

- **Trigger:** Organize should star resume-worthy stacks for the public profile row
- **Finding:** Portfolio inclusion is a wide set; featured-on-profile is a tight resume Skills row (cap ~6–12). Do not reuse the same cutoff for both
- **Finding:** LLM profile picks must be ordinals into a sort-head window, then `resolveFeaturedStackIds` drops lint/test noise and fills short lists from the heuristic
- **Finding:** Featured-only organize results are still reviewable — `actions.length === 0 && sortOrder.length === 0` must not toast "already organized" when `featuredStackIds` is non-empty
- **Finding:** `stacks.batchUpdate` must apply `includedInPortfolio` options even when the drizzle column patch is empty; putting the flag on `data` hits a non-column
- **Finding:** New `@tsu-stack/core` exports need `pnpm --filter @tsu-stack/agent rebuild:core-cache` or organize looks like "AI unavailable"
- **User preference:** Auto-select the stacks that belong on the public profile / resume, not the whole catalog
- **Evidence class:** Core unit matrix + live local catalog smoke (React/Next/Tailwind in; Husky/Lodash/Axios out). Browser organize wizard not exercised (signed out)

## 2026-08-13 — Hub agent superpowers hardening

- **Trigger:** Implement + harden hub superpowers tools (triage HITL, maxSteps 16, floater)
- **Finding:** `ToolCallFilter({ filterAfterToolSteps: 2 })` drops mid-chain tool results (e.g. `listNewJobs`) before later HITL tools — multi-tool golden paths need a higher window (we used 8) or the model thrash-relists and reports empty
- **Finding:** Client HITL `addResult` alone may update toolkit UI without re-POSTing the chat — always also call Chat `addToolOutput` so `sendAutomaticallyWhen` can resume
- **Finding:** Multiple open client HITL cards in one thread block resume if auto-resume requires all client tools complete — cancel sibling pending cards on confirm, or only gate on the latest client tool step
- **Finding:** Premature assistant final text after a client tool (“awaiting confirmation”) makes last-step-only auto-resume miss; allow resume for `confirm`/`package`/`save` even with that text, but stop after failed-continuation copy (“tool-step limit”) to avoid infinite re-POST
- **Finding:** API `HUB_CHAT_MAX_STEPS` and agent `maxSteps` must stay aligned and the **API process must be restarted** after changing the constant — a stale API still sending maxSteps 4 burns multi-tool turns
- **Finding:** Devtools overlays (TanStack Devtools) can intercept pointer events on fixed floater triggers — force-click or hide during browser automation
- **Finding:** Local session cookies for curl must use host `localhost` vs `127.0.0.1` consistently with the browser origin
- **Evidence class:** Browser hub Thread + floater, chatStream POST after confirm, unit matrix on shouldAutoResume + stage/policy stress tests, applications.list inbox counts

## 2026-08-13 — Detect / organize hardening (seed)

- **Trigger:** User-reported detect stacks bugs; full-project hardening before hub superpowers implementation
- **Finding:** Dual entry paths diverge — form-only bridges do not attach list/menu side effects; always persist at the domain API for both paths
- **Finding:** Intermediate workflow steps can drop good data (e.g. rebuild `matched` from categorized only); assert exists/library rows after each pipeline stage when debugging
- **Finding:** Multi-product npm scopes must not blanket-merge by scope string; use product families + mono-product allowlists
- **Finding:** Soft AI failure (all-low confidence, empty icons) needs deterministic family fallbacks before LLM
- **Finding:** `projects.update` with only `stackIds` can fail if the repository issues an empty SQL SET — support field-only updates
- **Finding:** API/stream success is not UI success; toast Review and dashboard-mounted hosts are required when sheets unmount
- **Finding:** Unsaved discard must use coss AlertDialog like entity forms — never `window.confirm` for product flows
- **Finding:** Private GitHub detect requires working OAuth on the session; public getSetupStatus is a different signal
- **Finding:** Session cookies for local curl need HMAC of token with BETTER_AUTH_SECRET; raw DB token alone returns null session
- **User preference:** Prefer coss confirmation dialogs consistent with the rest of the dashboard
- **Evidence class:** SSE step traces, oRPC projects.update, browser dialog pattern audit

## How to grow this file

- Prefer **one finding per bullet**, not a diary of the session
- If a checklist item in `checklists.md` would have caught it, add/adjust the checklist instead of only narrating
- Deduplicate: if a finding already exists, strengthen it — do not paste a near-duplicate
