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

## 2026-08-16 — Evidence interview: identity brief does not resume; list + needs live agent

- **Trigger:** Conversational evidence Tasks 1–10 then hardening (home Thread + floater + list `+`)
- **Finding:** After `get-search-brief`, auto-resume is only for a _section_ question (`searchBriefUserTurnNeedsSpokenAnswer`). A matrix case with no user text is identity/preview — `resumeAfterOutput` must be false. Stale `true` fails after Task 8
- **Finding:** List `+` lazy-mounts the hub floater (`widgets/agent-hub`). If Vite or `:5200` drops mid-import, CatchBoundary shows a generic 500 — that is not “form still opened”
- **Finding:** Live interview / Confirm persist cannot be proven when `:4111` is down. Unit seams (goals, rank, payload, resume, post-evidence `activeTools`) are not a substitute
- **User preference:** Everyday language; no form door; File Diff ApprovalCard writes on Confirm
- **Evidence class:** Web 254 unit (after matrix fix); agent 68 policy/processor/mapper; Playwright `/dashboard/projects` Add Project while `:3000`/`:5200` died; `:4111` refused

## 2026-08-16 — AgentCore harden/debug is inspiration, not a runner

- **Trigger:** Asked whether AWS `agents-harden` / `agents-debug` / `agents-optimize` can harden the Mastra hub agent
- **Finding:** Those skills require `agentcore` ≥ 0.9 and `agentcore.json` (Bedrock IAM, JWT/SigV4, Secrets Manager, Gateway, X-Ray, `maxVms`). This repo is session-only Better Auth, BYO LLM, oRPC, and `@tsu-stack/logger`. Do not install the plugin or run `agentcore`
- **Finding:** Steal the _classes_ of check: inbound auth fail-closed, no secrets in agent env/logs, Zod + payload size, tenant `resourceId`, safe product errors, read traces yourself, scorer sampling as eval baseline. Product HITL / dual-entry / browser stays in this skill
- **Finding:** Local translations: unauthenticated `:4111` `/chat` → 401; `memory: { thread, resource }` not top-level ids; one hub thread per user; Mastra `createScorer` + `sampling`, not `agentcore run eval`
- **User preference:** Update the existing harden + testing docs; do not vendor the AWS skill tree
- **Evidence class:** AWS skill sources vs `apps/agent/AGENTS.md` + `MastraAuthBetterAuth` / `hubChatMemoryOptions`

## 2026-08-16 — Hard-stop confirm must not resume into triage

- **Trigger:** “make it 45000 EGP” → confirm card → card again → Generating → New jobs triage; “Updated hard-stop preferences” missing from the steps strip
- **Finding:** Hard-stop was a “choice” tool so it never became an Agent Activity step. After confirm the strip had zero items and fell back to “Working through it…”. Put completed hard-stop in the working strip with label “Updating hard-stop preferences”
- **Finding:** Confirm + addToolOutput still auto-resumed when output/action was not visible yet, or a second propose sat in the same turn. Treat hard-stop complete as terminal by tool name; cancel sibling cards; drop later proposes after confirm this turn
- **Finding:** After a salary/exclude/level write the client should show File Diff (ensureBrief). Do not let the model listNewJobs / triage
- **User preference:** Confirm is the write; the next surface is the brief, not a new jobs card
- **Evidence class:** Chrome screenshots — two receipts, Generating, then New jobs triage on a salary-only turn

## 2026-08-16 — Search brief File Diff + triage confirm writes

- **Trigger:** Keep the beUI File Diff lock; empty New jobs card; confirm loop (two receipts + Generating); card must appear on everyday wording about rules / what they want
- **Finding:** File Diff gated on `searchBriefChanged` hid cache hits and first builds (`previousMarkdown == null`). Show the card whenever markdown exists; `previousMarkdown ?? ""`; keep it open (`defaultOpen`, no collapse)
- **Finding:** DeepSeek thinking 400s on `toolChoice: "required"` after listNewJobs. Steer with `activeTools` + feedback only
- **Finding:** Empty `propose-new-jobs-triage` args are not an empty inbox. Hydrate Track from the last `listNewJobs` result or `applications.list` inbox. Auto-complete only when inbox is actually empty
- **Finding:** Streaming HITL args mount the card before rows exist, so checkboxes init empty. Key the card on proposed ids so it remounts when ids arrive
- **Finding:** After Confirm, auto-resume often re-proposes instead of `trackJob`/`dismissJob` (Mastra memory may not see the client output). Write promote/dismiss on the Confirm button and treat confirm as terminal — same lesson as JD save/package
- **Finding:** A later propose after confirm this turn must not lock or show a second receipt. Scope that guard to the latest user turn so a new ask can triage again
- **User preference:** Keep jal-co / side-panel brief save out. Test with everyday language; do not coach product steps
- **Evidence class:** Chrome hub — “what am I looking for?” / “what are my job rules?” opened `search-brief.md` +18; “can you show me the jobs that came in?” filled triage; Confirm track 7 → inbox 0, tracked 13, one receipt, no second card

## 2026-08-16 — Preview inspect vs edit-plan form

- **Trigger:** Hub “show my latest project” dumped prose instead of the side-panel project view; “make it backend” opened the edit form with no plan and often a stale/empty id
- **Finding:** Preview and edit are different panel hosts. Preview remounts the original inspect view (`ProjectInfoPanel` / experience / stack). Edit must not skip the confirm card
- **Finding:** `open-entity-form` needs a non-empty `plan`. The HITL card is the approval; only Confirm remounts the original form. Cancel completes cancelled
- **Finding:** Mounting `ProjectForm` with `{ id }` only can paint an empty title before `projects.get` lands, and a once-per-id `form.reset` can skip the real row. Prefetch get in the host and pass the full entity as `initialData`
- **User preference:** Agent discusses the change, summarizes the edit plan, and opens the side-panel form only after the user approves
- **Evidence class:** Chrome hub — “Show my latest project” opened Dev-Hub inspect (Overview/Analysis); edit request showed “Open project form” + plan + Open form/Cancel; after confirm, Edit Project title “Dev-Hub”

## 2026-08-16 — Client enqueue tools must not auto-resume while wrap-up streams

- **Trigger:** Search brief + hub operator harden — Settings Jobs fields, hub `get-search-brief` / `find-jobs-now` / hard-stop card / entity form host
- **Finding:** `sendAutomaticallyWhen` that treats `text.state === "streaming"` as “no final text yet → resume now” re-POSTs the same turn. The model then repeats the tool UI line (`Search is queued · N seats`, `Search brief is current`) dozens of times and stacks `findNow` toasts
- **Finding:** `find-jobs-now` and `get-search-brief` already render the user-visible report. After `addToolOutput` they are terminal — do not put them on the mutation-continuation list. Hide assistant text after those completed parts
- **Finding:** History hydrate remounts every incomplete client tool. A no-arg enqueue tool must claim once per `toolCallId` and skip extra calls while the job store is `running`, or each leftover part fires `enqueueFindJobsNow` → “already running” toast spam
- **Finding:** `open-entity-form` from scrollback remounts the side panel on every `/dashboard` visit (often `Experience not found` with a stale id). Only the last assistant message may own the host; older waiting calls complete as cancelled. Persist a dismissed-id set so Cancel does not remount siblings
- **Finding:** Do not call `useX()` behind a ternary in not-found entity forms (`missing ? false : useEntityFormDirty`). That drops a hook and 500s the dashboard (`Rendered fewer hooks than expected`)
- **Finding:** oRPC procedures with no `.input()` reject `POST {"json":{}}` (400, empty body). Call with no JSON wrapper or `{}`. `jobPreference.get` still uses `{"json":{}}`
- **Finding:** TanStack Devtools can swallow the first click on `Open hub assistant`. Close the overlay or `element.click()` the real button
- **User preference:** Hard-stop writes stay on the confirm card (Confirm/Cancel); no model-callable apply tool
- **Evidence class:** Chrome hub Thread + floater — 48× queued / 70× Finding jobs; Settings salary 3000 USD + Senior + leftover worldwide hint; oRPC `ensureBrief` rebuilt + `findNow` `{ok, seats:50}` then New jobs tab `New 8`; floater card `Add exclude: Salesforce` → persist `php, react native, Salesforce`; 79 web unit tests

## 2026-08-16 — JD card save/package must land on Tracked jobs

- **Trigger:** LinkedIn/JD proposal card rendered, but Save / Continue with package did not finish the CRM write or leave the home thread
- **Finding:** After a client HITL choice the model often re-proposes or never calls `create-application`. The JD card buttons **are** the confirmation — create (and optional generate) on the client, put `applicationId` on `addToolOutput`, and do not auto-resume that save/package
- **Finding:** Tracked jobs had no inspect deep link. Mirror projects/resumes: `?applicationId=` + `showView`, then `replace` the search. Seed the tracked list cache before navigate so the panel is not waiting on refetch
- **Finding:** The small hub floater only mounts off `/dashboard`. Request-open **before** navigate (one-shot store). Derive `open || pending` — do not `setState` in an effect to consume the request
- **Finding:** `features/agent-hub` cannot import `features/applications`. Own the create/generate mutations in the hub slice via oRPC
- **User preference:** After save or package, go to Tracked jobs, open that job’s side panel, and open the small hub assistant to continue
- **Evidence class:** Chrome — Save on Verification Flow Designer → `/dashboard/tracked-jobs`, Saved column card, inspect heading + JD, floater dialog “Hub assistant” + “You chose: Save only”

## 2026-08-16 — Hub HITL card family chrome

- **Trigger:** Task 6 harden 3c `HubHitlFrame` on hub Thread (JD proposal, package approval, new-jobs triage) against the worktree `:3000` / `:5200` / `:4111`
- **Finding:** `requireToolApproval` tools often arrive as `input-available` / `status.type === "requires-action"` with `approval: null`. Gating the product card on `approval != null` falls through to ToolFallback (`Used tool:` + JSON + Allow/Deny). Treat no-result + not-complete as pending for those tools
- **Finding:** `respondToApproval` is always a function on the part runtime, but it **throws** when `state.approval` is missing. Calling it first and returning leaves `Submitting…` forever. Prefer `addToolApprovalResponse` after lifting the part to `approval-requested` (`runId::toolCallId` from `data-tool-call-approval`). If no id exists, a local `addToolOutput` unsticks the composer
- **Finding:** Lucide icons default to `aria-hidden="true"`. A bare `<ShieldAlert />` in coss Alert fails the “semantic alert icon” rule — pass `aria-hidden={false}`
- **Finding:** Native `textarea` fill does not enable assistant-ui Send. Set the prototype value setter and dispatch `input` before clicking Send
- **Finding:** Isolated Chrome cookie mint: HMAC-SHA256 of the DB `session.token` with `BETTER_AUTH_SECRET`, value `token.base64`, set `document.cookie` on `localhost` (not `127.0.0.1`). Probe `GET /auth/get-session` until the body is a session object, not `null`
- **Finding:** Client HITL receipts (`You chose:`) live in toolkit UI state. Reload remounts incomplete `input-available` cards (history has no output). Last-message-only composer lock is correct; older live cards in the scrollback are leftover incomplete parts
- **Finding:** After a client HITL choice the model may re-call `propose-application-from-jd` instead of `create-application` / `generate-apply-package`. Force the approval tool by name + `applicationId` when you need that chrome
- **User preference:** Pending HITL chrome is inline Alert/Card, not AlertDialog; never dump JSON args
- **Evidence class:** Chrome hub Thread — JD recommendation `data-hitl-kind=recommendation` + three buttons; generate-apply-package Alert title/body/Approve (no `{applicationId`); composer `Waiting for your choice…` / `Waiting for approval…`; triage Confirm/Cancel + cancel receipt; New jobs list unchanged after cancel; 29 web unit tests

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
