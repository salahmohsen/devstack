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

## 2026-08-15 — Two-axis evaluate-then-insert hardening

- **Trigger:** Task 9 harden Find now after evaluate-then-insert (hybrid-only then hybrid+remote, Settings check, New jobs Details, Dismissed `via: low_match`)
- **Finding:** Do not run worktree `scripts/dev.sh` against infra already owned by another checkout. The compose bind-mount path for `init-databases.sh` recreates postgres; the script EXIT trap then `compose down`. Start the three package `dev` scripts and `docker compose -f docker-compose.infra.yml up -d`. SIGSTOP parent restart wrappers instead of killing a compose-attached `dev.sh`
- **Finding:** `findNow` cheap-unseen ignores two-axis. Hybrid-only prefs on a remote-heavy catalog return `ingestTriggered: false` then land `empty_shelf`. That is a correct two-axis drop, not a dead queue. Add remote (or an overlapping hybrid place) before expecting keepers
- **Finding:** Isolated Chrome after a binary switch is signed out. Mint HMAC from the current `session` row; set `document.cookie` on `localhost` (not `127.0.0.1`) plus `Cookie` extra headers. A parent-tab serverFn ID 500 is stale Start cache, not an auth outage
- **Finding:** Remote+uk overlaps Egypt/KSA through the `emea` ancestor walk. That is taxonomy, not a LatAm leak. Assert `Remote · LatAm` / catalog latam `app_rows=0`, not “no UK remotes”
- **Finding:** Tracked empty is not a wipe when the surviving non-discovery rows are `tracking_status=inbox`. Count those rows by `discovery_run_id IS NULL` / missing `discovery` tag, then look at New jobs
- **Finding:** BYO scorer can still return `source: heuristic` for most evaluates. Soft-fail must keep the stub (no take). Raise `minMatchScore` while inbox-ai jobs are still queued to get a `via: low_match` dismissed row; restore 70 after settle
- **Evidence class:** oRPC findNow 401→`{ok, ingestTriggered:false}` then land `empty_shelf` / `{ok}` + 9 inbox + 1 dismissed; DB latam `app_rows=0`; Chrome Settings Hybrid check + locations tooltip; Details `Work mode Remote`; activity `via: low_match`; core 51 + api 33 unit tests

## 2026-08-15 — Discovery land pool, BullMQ job ids, and the AI bar

- **Trigger:** Harden + review job discovery after adapters shipped (Find jobs now, land, inbox AI, Settings, Tracked)
- **Finding:** A reserved-slot land pool is incremental per call. Passing `alreadyLanded + extraBudget` as the extra-pass limit reuses the old sequential _cumulative_ target and overshoots N / 50
- **Finding:** BullMQ custom job ids reject `:`. Query keys like `pack:frontend` must be sanitized before they become `ingest_*` ids or Find jobs now returns `queue_unavailable` whenever the shelf is thin
- **Finding:** Soft AI failure (`source: heuristic`) must keep the cheap stub and refund the reserved daily attempt. Dismissing on the cheap bar after a scorer fallback treats `minMatchScore` as a cheap gate
- **Finding:** If inbox-AI enqueue fails, delete the stub you just created. A forever-pending row occupies the 50 cap and blocks the URL
- **Finding:** The preference scorer must see more than a 800-char teaser once hydrate wrote a full JD (use a named window well above the thin-JD threshold)
- **Finding:** `applications.list` for inbox still ships every JD. Fifty hydrated descriptions is ~50–120kB; do not parse the full JSON in a shell heredoc
- **Finding:** A cookie file can exist and still be 401 — mint HMAC from the _current_ `session` row. Isolated Chrome already on `:3000` can stay signed in while curl is not
- **Evidence class:** oRPC findNow `Custom Id cannot contain :` → sanitized `ingest_…_pack_frontend_…` then `{ok, ingestTriggered, landed:2}` to inbox 50; Chrome New jobs / Settings pack+N / Tracked board+list “Listing closed”; core/api unit tests

## 2026-08-15 — Harden the worktree binary, not a healthy port from another checkout

- **Trigger:** Job discovery adapters Task 17 (findNow, Scan gate, classify harvest, inbox land)
- **Finding:** HTTP 200 on `:3000` / `:5200` is not this branch. A parent-repo `pnpm dev` can own the product ports while the worktree has `findNow`, title packs, and `importFromEmail` gates. Probe a procedure that only exists on the feature (`POST /rpc/jobDiscovery/findNow`) before treating the loop as live
- **Finding:** Stopping a compose-attached `pnpm dev` can exit postgres/redis/minio. `docker compose -f docker-compose.infra.yml up -d` and a DB row count before claiming the app cannot start
- **Finding:** Do not call `applications.scanJobAlerts` against an unverified binary — a stale handler enqueues harvest even when the toggle is off. Confirm `importFromEmail: false` on the running server first (or expect leftover BullMQ harvests)
- **Finding:** Leftover harvest jobs are a valid toggle-off proof: worker log `mail_job_harvest_skip_import_disabled` / `importFromEmail: false` and `created: 0`
- **Finding:** Extra `Cookie` headers authenticate one document request; the client router then signs out unless `document.cookie` is set on that origin (httpOnly jar is not shared with isolated Chrome)
- **Finding:** Natural AI scores may all pass. To exercise fail → Dismissed → backfill, raise `minMatchScore` while inbox-AI jobs are still queued (worker reads prefs at run time), then restore the bar so the daily `2×N` cap is not burned
- **Finding:** URL dedup (`any trackingStatus`) means no-key then with-key cannot re-land the same listing. Run no-key first, or rely on a thick shelf for a second land
- **Evidence class:** oRPC findNow 404 vs `{ title_required | ok }`; scanJobAlerts 13-enqueue vs `{0,0}`; classify `harvestEnqueued: false`; land `inboxai` outcomes; Chrome Settings / New jobs / Tracked

## 2026-08-14 — Dashboard chrome must not work until the surface is on screen

- **Trigger:** Close remaining dashboard first-paint gaps after the payload loop; restart Mastra agent
- **Finding:** A widget barrel that re-exports both the home Thread and the floater makes Vite evaluate the Thread on every dashboard route. Keep the floater off that barrel (page-local modal + lazy Thread) so mail/jobs/settings do not parse hub history
- **Finding:** `HubChatProvider` can own the Chat instance, but `listHubMessages` / `aiSettings` must wait until a Thread actually mounts (`ensureHistory` + `enabled: open`)
- **Finding:** Entity forms that fetch GitHub repos / sibling lists on mount tax the list page. Mount the sheet only when `open`, and gate those queries with `enabled: open`
- **Finding:** FSD `no-public-api-sidestep` rejects `lazy(() => import("@/features/x/ui/…"))`. Lazy through the slice public API (`import("@/features/x")`) or move the overlay into the page layer
- **Finding:** Dashboard topbar must not `preloadRouteOnce` public `/` and `/repos` — those loaders fetch portfolio + GitHub and delay every dashboard navigation
- **Finding:** Restart the agent with the package `dev` script (rebuilds the core ESM cache first). A live Studio 200 is not enough after a kill — confirm `listHubMessages` 200
- **Evidence class:** Chrome fetch log on mail/projects/jobs/settings (no `listHubMessages` / `portfolio.list` / `privateGetProfileRepos` until hub or form open); floater + home Thread after agent restart; Settings username `salah`; Profile nav `/salah`

## 2026-08-14 — Dashboard lists share the SVG payload tax

- **Trigger:** Authenticated dashboard performance loop (home, jobs, mail, projects, stacks, settings)
- **Finding:** Cap inline stack SVGs in `toStackOutput`, not only the public portfolio mapper. Dashboard `stacks.list` / `projects.listPage` / `experiences.list` shipped the same 125kB Emotion/Zustand icons
- **Finding:** Experience list/inspect only needs nested project `title` + `year`. Mapping full `toProjectOutput` (stacks + analysis) turned 3 experiences into hundreds of KB
- **Finding:** Hub home LCP is the ClientOnly fallback. A spinner as fallback makes LCP a placeholder; paint the same welcome heading in the fallback
- **Finding:** Agent history RPCs (`listHubMessages`, `listSuspendedRuns`) 500 when the agent is down. Retrying them on every dashboard route delays first paint — `retry: false` and treat failure as empty history
- **Finding:** Extra `Cookie` headers authenticate the first navigation; reload traces need a real `document.cookie` (or the cookie jar). Isolated Chrome does not inherit the user's browser cookies
- **Evidence class:** Chrome traces on `/dashboard`, `/dashboard/new-jobs`, `/dashboard/mail`, `/dashboard/projects`, `/dashboard/stacks`; curl sizes for list RPCs (no secrets)

## 2026-08-14 — Public portfolio payload is the LCP budget

- **Trigger:** Browser + Chrome DevTools performance hardening (CWV, React, animation, backend)
- **Finding:** `portfolio.list` must not embed full stack SVGs on every project. Emotion was ~125kB duplicated across projects and nested `experience.projects`. Send icons once on the catalog; join by id on the client. Cap or drop inline SVGs over ~4kB
- **Finding:** Public experience timeline does not render nested projects. Shipping `experience.projects` with the same stack blobs doubles the JSON and the SSR dehydrate payload
- **Finding:** `resume.getDefault` returning `undefined` (serialized as `{}`) makes TanStack Query throw on every public profile SSR. Optional empty reads must be `null`
- **Finding:** Vite-node `--watch` on `apps/server` does not reliably reload `packages/api` edits. Restart the API after mapper/router changes or you will measure the old payload
- **Finding:** Eager TanStack Devtools in `__root` puts vendor fonts on the critical path. Lazy-import the overlay only in `import.meta.env.DEV`
- **Finding:** Reading `offsetWidth` in a width-tween effect forces a ~50ms reflow. Track last width with ResizeObserver instead
- **Evidence class:** Chrome Performance traces (`/salah` LCP/TTFB/document bytes); curl `portfolio/list` + SSR HTML sizes; mapper unit tests

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
