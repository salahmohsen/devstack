# Living lessons

**Agents:** Read this file at the start of every `ai-feature-harness` run.  
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

## 2026-08-18 — Agent Docker boot needs explicit files-sdk AWS peers

- **Trigger:** Redeployed `devhub-agent` crashed on boot after DB ensure
- **Finding:** `files-sdk/s3` imports `@aws-sdk/client-s3`, but those AWS packages are **optional peers**. Mastra’s nested `.mastra/output` install (path like `files-sdk@…_hono@…_zod@…` with **no** aws peer hash) does not install them unless the agent package declares them
- **Finding:** Local `mastra dev` can still resolve via monorepo hoist from `apps/web`’s AWS deps. Prod `node .mastra/output/index.mjs` cannot. Add `@aws-sdk/client-s3`, `lib-storage`, `s3-presigned-post`, `s3-request-presigner` as **dependencies** on `@tsu-stack/agent` (not only web `devDependencies`)
- **Evidence class:** Dokploy agent stdout `ERR_MODULE_NOT_FOUND @aws-sdk/client-s3` from `files-sdk/dist/chunk-*.js`

## 2026-08-18 — Prod hub “no inbox” is missing tool calls + stale agent roll

- **Trigger:** Prod reply “I have no inbox access / mail tools only work on a message id”; tools and side panels fail while local works
- **Finding:** Diff `listHubMessages.uiMessages` first. The mail turn was `reasoning`+`text` only — **no** `tool-listMail` / `tool-searchMail`. Side panel never opens when `getSearchBrief` / `getDailyBrief` / `openEntityInspect` are never called
- **Finding:** Same DeepSeek BYO locally on a clean epoch: `what's up` → `getDailyBrief`; `any mail that matters?` → `listMail`/`searchMail`; `what are my job rules?` → `getSearchBrief`. Prod fresh epoch: all three were text-only or wrong tool (`getJobPreferences`). Force processors are not winning in the running prod agent path
- **Finding:** Agent evlog `version` can stay stuck on an old SHA (`2201e003`) while Dokploy deploy titles show newer builds (`06f677cb`). `encode-db-url.sh` only reads `/etc/tsu-source-commit` when `SOURCE_COMMIT` is empty/`unknown` — a sticky Dokploy env `SOURCE_COMMIT` masks the baked image SHA forever
- **Finding:** Dokploy `application.deploy` / `redeploy` can return success without creating a new deployment row. Treat “MCP said ok” as non-evidence. Confirm a new deployment id + post-roll `version` + a live tool call
- **Finding:** Stopping `devhub-agent` makes prod `chatStream` 500 — that Dokploy app is the live worker. Start/reload can 502/timeout after stop; recover from the Dokploy UI Deploy/Start, not only MCP
- **Finding:** CI `mark_deployed` runs when `application.deploy` is _accepted_, not when the container is healthy. Path-skip cache can then skip agent on later pushes even if the roll never actually served new code
- **Finding:** There is still no force processor for generic inbox asks (`any mail that matters?` / `list my emails`). Even on current code, DeepSeek can narrate “no list tool” among ~57 tools unless `listMail`/`searchMail` are forced
- **User preference:** Redeploy agent from Dokploy UI; check/remove sticky `SOURCE_COMMIT` in agent env
- **Evidence class:** Prod `listHubMessages` + live `chatStream` SSE; local clean-epoch SSE; Axiom agent `version`; Dokploy deploy log ends at build; stop→500 proof

## 2026-08-18 — New hub session + slash/mention composer

- **Trigger:** Fix sticky “tools dead” thread, File Diff gaps, one-thread forever; add assistant-ui slash commands and @ tool mentions
- **Finding:** Hub memory was hard-coded `dashboard-home:{userId}`. Rotating `user_hub_state.hub_chat_epoch` and thread id `…:e{n}` (epoch 0 keeps the original id) is the clean “new session” for Mastra memory without deleting history
- **Finding:** `startNewHubChat` must clear client messages, reset history load refs, and re-fetch page 0 for the new epoch — server-only epoch bump leaves the old UI transcript painted
- **Finding:** assistant-ui slash/mention need `ComposerTriggerPopover` + `Unstable_TriggerPopoverRoot`. `unstable_defaultDirectiveFormatter` is `{ serialize, parse }`, not a bare function. Mention insert text belongs in `metadata.insertText` + custom `serialize`
- **Finding:** Clean epoch + force processors: File Diff (`search-brief.md`) and Today panel + stack catalog all painted on the same thread without “tool not found” exclusivity
- **User preference:** `/new` for fresh chat; `@` to pick tools (everyday insert text); `/today` `/rules` `/skills` etc.
- **Evidence class:** Chrome listbox `/new`…`/mail` and `@Today`…`@Find jobs`; File Diff after “show me my job rules”; Today dialog + stack badges on packed ask; oRPC startNewHubChat epoch 1→2; unauth chat 401

## 2026-08-17 — Packed multi-ask exclusive activeTools + text-only force spam

- **Trigger:** Average-user hub UI cycle on main — packed “catch me up + skills + looking for”, job rules, stack catalog, Today, reasoning chrome
- **Finding:** Concurrent force processors (Today / stacks / company / inspect) each set an **exclusive** `activeTools` list. Later processors overwrite earlier ones. Live proof: `tool-getDailyBrief` output was the string `Tool "getDailyBrief" not found. Available tools: listStacks` while `listStacks` succeeded and the stack catalog UI painted
- **Finding:** Treat “Tool … not found / Available tools:” string outputs as **failed** tool results. `mastraPartHasToolResult` alone marks sawFacts/sawList true and stops the force loop while the panel never opens
- **Finding:** Union forced reads into one allowlist (`filterHubUnionForcedReadActiveTools`) and share it from every force processor. Add `HubSearchBriefGatherProcessor` for everyday job-rules / looking-for asks so File Diff is forced the same way as Today
- **Finding:** `onIterationComplete` that always `continue: true` while `messagesNeedDailyBriefFacts` (with no tool call) maxSteps-spams “Only getDailyBrief works / Still here” when the model ignores `toolChoice`. Cap: text-only after step ≥1 → stop
- **Finding:** Reasoning panel `useState(true)` left every Thought expanded forever. Match assistant-ui ReasoningRoot: open while streaming, collapse when done (user toggle wins)
- **Finding:** Detectors must accept contracted English: `what I'm looking for` ≠ `what am i looking for`; `pull my skills list` / `skills on file` need stack-catalog coverage
- **Finding:** After “tools are dead” history lands in Observational Memory, the model **narrates** “only getDailyBrief is callable” even when other tools are registered. Diff `uiMessages` tool parts vs spoken claims before changing tool registration. One-thread-per-user makes this sticky until OM rolls off
- **User preference:** Everyday multi-ask; File Diff for job rules; stack catalog UI not prose dumps; Thought collapsed by default after stream
- **Evidence class:** Chrome hub Thread (stack catalog `data-slot=stack-catalog`; Thought collapsed; File Diff missing while model text-only); `listHubMessages` `tool-getDailyBrief` NOTFOUND + `tool-listStacks` ok; unauth `:4111/chat` 401; agent unit 84 + core stack-ask 3

## 2026-08-17 — Silent search-brief turn invented Cancelled New jobs triage

- **Trigger:** “what are my jobs goals?” showed `search-brief.md` plus a Cancelled New jobs card (inbox rows)
- **Finding:** `listHubMessages` on that turn has only `getSearchBrief`. A card in the DOM with no matching tool part is a **client receipt**, not a model call. Diff `uiMessages` vs DOM before blaming the supervisor
- **Finding:** `HubCancelledTriageReceipt` runs on every assistant bubble. `cancelledTriageCardInputFromParts` recovers a leak when `listNewJobs` never mounted HITL. On a silent card-only turn it used **current inbox** as fallback. Today already returns null; search brief did not
- **Finding:** Inbox fallback is only valid when **this** message has triage-processor leak text. Empty parts + inbox is not a leak. History remount then stamps the fake card `cancel` / “No longer pending”
- **User preference:** Everyday phrasing; File Diff is the UI for job goals/rules; do not invent triage
- **Evidence class:** Local `uiMessages` (`tool-getSearchBrief` only); Chrome after fix — File Diff, zero “New jobs triage”; unit helper RED then GREEN

## 2026-08-17 — Production hub: promised tools, collapsed strip, API cookie host

- **Trigger:** First systematic prod debug of hub chat (dashboard + `listHubMessages` + Axiom `devhub` + Dokploy `devhub-agent`/`web`/`server`)
- **Finding:** “Tools don’t render in prod” is three layers. (1) The model wrote “Let me pull the stack list” with **no** `listStacks` part. (2) When the tool did run, `HubToolFallback` returns null for working-strip names and Agent Activity `collapseOnComplete` leaves a 28px `Thought for 0s` row. (3) `listExperiences` has a standalone timeline; `listStacks` does not — a successful call has no catalog UI
- **Finding:** `listHubMessages` `uiMessages` already maps Mastra `tool-invocation` → `tool-<name>` with `toolCallId`. Empty chrome with a tool part is a **client render** bug. Empty chrome with only `reasoning`+`text` is a **missing call**. Always diff those two before changing the mapper
- **Finding:** `onIterationComplete` treats “spoken text + zero tools” as terminal. Over-threshold Observational Memory (`messages.tokens` ≥ 30k) makes DeepSeek narrate a tool and stop. Force the catalog tool (same class as Today / inspect); hide the prelude line
- **Finding:** `shouldStopAfter*` must only count spoken text **after** the tool. Whole-message `mastraMessageText` treats “Let me pull the stack list” as a finished answer and stops the force loop
- **Finding:** Production Better Auth `__Secure-*` cookies are on the **API** host (`api.…`), not the web host. Extra `Cookie` on `hub.…` SSRs the shell and still 401s `listHubMessages`. Decode `%2B`/`%3D` in the token
- **Finding:** Dokploy `application-one` / deploy title is the running SHA. Agent evlog `version` can be an older CI stamp. `autoDeploy` may be off — a green local HEAD is not proof prod is that commit
- **Finding:** `LinkedJobSkillsPayloadSchema` as structured output crashes the stream when the model omits `band` or uses “must-have”. Sanitize already drops bad rows — the **LLM schema** must be loose; crash is `Error in agent stream`
- **User preference:** Everyday phrasing; do not coach tool names; read Axiom + Dokploy yourself
- **Evidence class:** Prod `uiMessages` (text-only vs `tool-listStacks`); Chrome collapsed Agent Activity; Axiom `agent_hub_chat_stream_started`; Dokploy agent `skills.*.band` validation errors

## 2026-08-17 — Today ask anytime: rolling 24h + stop the self-prompt loop

- **Trigger:** Harden Today so “what’s up / what is new today” always gathers until _now_, and the supervisor stops chatting “Still here / Hey / That’s the whole plot” until the panel finally opens
- **Finding:** Forcing `openDailyBrief` after `getDailyBrief` is an infinite continue loop. The model writes idle greetings instead of the tool. Open the panel from `getDailyBrief` on the client and **stop** the supervisor once facts land (unless the same turn also asked inspect/CRM)
- **Finding:** `onIterationComplete` `continue: true` whenever `toolCount > 0` adds an extra idle step after a successful Today gather. Treat Today-only + facts as terminal
- **Finding:** A cursor-shrunk window reads as a stale dated letter (“Nothing new since 17 August”). Always gather last 24h ending at ask time. Reuse the last letter only when the facts hash matches (in-process Map). Empty → “Nothing new right now.” — do not replay yesterday’s story
- **Finding:** Writer timeout / fat fact JSON returns “Could not write Today.” Slim the writer payload and fall back to a short facts letter so the panel still has the current window
- **Finding:** Hide-after that only cuts _after_ `openDailyBrief` misses letter paste and idle text _before_ the tool. On a Today-only latest turn, hide all spoken parts. After `getDailyBrief`, hide everything after that tool unless a later inspect/CRM tool exists
- **Finding:** `cancelledTriageCardInputFromParts` hydrates a leftover New jobs card onto a silent Today turn (no spoken text, fallback inbox rows). Skip recovery when the message already has `getDailyBrief` / `openDailyBrief`
- **Finding:** History remount + “clear panel on every message change” wipes a just-opened letter. Clear once per user message id on a Today ask
- **User preference:** Test in the user’s Chrome tab. Everyday phrasing (`what's up`, `what's new today`). No `deleteMail`. Do not coach tool names
- **Evidence class:** Chrome hub Thread — first `what's up` opened Today (`0 new jobs · 40 mail · 9 tracked`) with no idle loop after the gather/stop fix; second `what's new today` ~30s writer; third `what's up` ~11s same letter (facts-hash cache); unauth `:4111/chat/hub-supervisor` 401; `markDailyBriefOpened` 200

## 2026-08-17 — Today letter workflow + db ESM cache + stale API stamp

- **Trigger:** Finish the Today-letter-as-story plan (classify summary, land take, `today-letter-workflow`, cursor stamp, no inventory fallback)
- **Finding:** New `@tsu-stack/db` exports crash the agent the same way as new core exports (`does not provide an export named 'userHubStateRepository'`). Rebuild `packages/db/node_modules/.cache/@tsu-stack__db.mjs` from the agent `dev` script (`rebuild:db-cache`), not only `rebuild:core-cache`
- **Finding:** New Mastra files imported via `#@/mastra/…` from `index.ts` can emit undefined `#@/` specifiers. Import new workflows/agents with **relative** paths from `index.ts`; keep `#@/` only for already-bundled modules
- **Finding:** vite-node `--watch` on `apps/server` does not pick up a new oRPC procedure (`agent.markDailyBriefOpened` stayed 404 until process restart). Probe the new route after adding it
- **Finding:** `formatDailyBriefMarkdown` stub `# date\n\nHere is what landed.` is not a letter. If `getDailyBrief` returns counts without `markdown`, the panel paints that stub. Do not `requestDailyBrief` on the placeholder; wait for workflow markdown. Empty window must stay the short “Nothing new” letter
- **Finding:** A leftover Confirm card Cancel can sit on Submitting… and still let Today complete. First Today (no cursor) used ~24h (39 mail / 0 inbox takes / 9 moves). After stamp, second Today opened **Nothing new** — inventory fallback is dead
- **User preference:** Test in the user's Chrome tab. Everyday phrasing. No `deleteMail` in this change
- **Evidence class:** Agent boot `userHubStateRepository` after db cache rebuild; curl unauth `:4111/chat/hub-supervisor` 401; oRPC `markDailyBriefOpened` 404 then 200 after API restart; Chrome hub Today panel `0 new jobs · 39 mail · 9 tracked` then `Nothing new` / `Nothing new since 17 August.`

## 2026-08-17 — Packed Today hide-after + remounted Confirm + pile status-only

- **Trigger:** Cycle 9 pre-PR harden — everyday packed ask then leftover HITL
- **Finding:** `hideHubAssistantTextAfterIndex` treated completed `openDailyBrief` as a hard cut (and leak-before-brief as hide-all). Packed inspect / brief / CRM speech after the letter vanished; the bubble looked empty while the Today panel opened
- **Finding:** Hide-after can only cut after an index. Hide processor leaks per text part (`shouldHideTextPart`). After Today, hide letter paste / “Today is open…” only when there is no later tool or real spoken answer
- **Finding:** Stale Confirm cancel that runs once on `historyReady` misses cards that hydrate later. Deduplicate by `toolCallId` and cancel whenever messages change. Waiting triage that is not on the latest assistant must complete `via: stale` and render nothing — Cancel mid-flight can sit on Submitting… forever
- **Finding:** Yes/no pile (“still just that one”, “don’t file”) must list and speak. `messagesNeedProposeTriage` is false for `userTurnAsksPileStatusOnly`
- **Finding:** Packed “catch me up + company + show X” is Today first, then company/inspect after the letter is open. Do not early-return company/inspect just because the same utterance also asked Today
- **Finding:** “Bells I missed” is `listNotifications`, not another mail search. The header unread count is a different surface
- **Finding:** After a status-only pile answer the model can loop “holding / nothing filed” until Stop. Treat a spoken status as terminal
- **User preference:** Everyday language; do not coach tool names; do not Confirm leftover cards; test in the user's Chrome tab
- **Evidence class:** Chrome hub Thread — first packed ask opened Today and hid later speech; leftover Eventogy triage remounted Submitting…; after the cut, inspect Ment’ech + `search-brief.md` + `listNewJobs`/`searchMail` with no triage; `listNotifications` + prefs on the bell/floor ask; unauth `:4111/chat/hub-supervisor` 401

## 2026-08-17 — Evidence list + / Edit form doors restored (dual entry)

- **Trigger:** User asked to restore experience/project/stack forms after `4c096d39` sent list `+` to hub interview
- **Finding:** Those doors were an intentional conversational-evidence lock, not a delete. Restoring them is dual entry: list `+` and inspect Edit mount the original sheets; hub chat still interviews and writes via File Diff Confirm
- **Finding:** Hub inspect Edit must use `EntityFormHost` with `completeOnClose: false`. Do not re-register `open-entity-form` as a model tool or leftover history remounts forms
- **Finding:** Hub inspect/form/Today hosts still win the side panel (`hostOwnsPanel` closes the page form)
- **User preference:** Keep detect stacks, organize, inspect, delete, portfolio
- **Evidence class:** Code restore on experiences/projects/stacks pages + stack card + hub inspect host

## 2026-08-17 — Packed "on my plate" skipped Today; yes/no pile opened triage

- **Trigger:** Cycle 8 skeptical senior — packed plate + Trivelta + pile, then leftover-letter poke, Ment'ech vs One Solution, RAYA source
- **Finding:** `userTurnAsksDailyBrief` start-anchors `^(what|…)\btoday` and requires the exact phrase `what's on my plate`. `"don't give me a vibe check. what's actually on my plate today"` is not Today, so the company processor runs and the letter is leftover
- **Finding:** `listNewJobs` on “pile empty or not” still trips `HubNewJobsTriageProcessor`. A yes/no pile question must list and speak, not open Confirm
- **Finding:** Company-status processor is live: same-turn `searchApplications` + `searchMail` + spoken Applied / Greenhouse Aug 16 without a poke
- **Finding:** Inspect still yields Today (`Ment’ech` / Senior Frontend Engineer). Prefs stay a forward filter on already-applied rows
- **Finding:** Naming `getProject` / `getExperience` in the spoken answer is a voice leak even when the facts are grounded
- **User preference:** Test in the user's Chrome tab. Everyday language. Do not coach tool names
- **Evidence class:** Chrome hub Thread — chatStream tools `searchApplications`/`searchMail`/`listNewJobs`; Cancel triage left New jobs at 1; inspect Ment’ech; unauth `:4111/chat/hub-supervisor` 401

## 2026-08-17 — "what we have today?" never counted as Today

- **Trigger:** Live ask `what we have today?` then `you didn't make any thing` — status lines only, no panel
- **Finding:** Today detectors that require "you" + "for me" miss average English (`what we have today`, `what do we have`). Expand the ask regex. Treat `you didn't make any thing` / `still nothing` as retries and walk back through retry turns to find the original Today ask
- **Finding:** A status line with zero tools is `onIterationComplete` stopping because `asked` was false. Once `asked` is true, gather/open feedback can continue
- **Finding:** `openDailyBrief` with `min(1)` lets the model open a stub letter (`**New in`). Require a real letter length
- **Finding:** Company/pile asks still die as "Checking…" unless the user pokes. Same class as Today: force `searchApplications`+`searchMail` / `listNewJobs`
- **User preference:** Test in the user's Chrome tab so they can watch. Everyday phrasing, not product names
- **Evidence class:** Chrome hub — after the phrase fix, `what we have today?` ran getDailyBrief + openDailyBrief and opened Today (`1 new job · 8 mail · 13 tracked`). Trivelta/pile needed a poke for a spoken answer

## 2026-08-17 — Today letter, leftover HITL, smartRules, Cairo

- **Trigger:** Last 20 hub messages failed Today (status/empty) and remounted One Solution inspect; user asked to harden + restore smartRules + make Cairo actually funny
- **Finding:** `mastraMessagesHavePendingClientHitl` that scans the **whole thread** stops Today. Old waiting `openEntityInspect` makes `onIterationComplete` return `continue: false`. Scope pending HITL to **this user turn**
- **Finding:** Inspect tool UI remounts any incomplete inspect and calls `requestEntityInspect`. Only the latest assistant message may own the host; older remounts complete `opened: false`
- **Finding:** `DailyBriefHost` stayed mounted over inspect. Opening a record must `clearDailyBriefRequest`, and Today must yield when inspect is active
- **Finding:** Saying "Opening Ment'ech" without `openEntityInspect` is the same promised-card class. Force search/get + inspect with a processor
- **Finding:** Packed "catch me up + company + mail" opens Today and drops the spoken CRM clauses. Today `activeTools` is greedy
- **Finding:** `sendSignal` / `onIterationComplete` feedback can appear as a visible assistant bubble. Wrap in `<system-reminder>` and hide leak text in the thread
- **Finding:** Chat `classifyMail` passed `smartRules: []` after `mailSmartRuleRepository` vanished from the db ESM cache. Inbox `run-mail-classify` was never stripped. Load rules with SQL (or rebuild the db cache) — do not drop the field
- **User preference:** Cairo is talkative short-line humor, not emoji-smile and not paragraph chit-chat. Everyday English; do not coach product names
- **Evidence class:** Chrome hub Thread — Today letter opened (Eventogy 88%, Trivelta scenic route); remount header `1 new job · 8 mail · 13 tracked`; poke "Applied… they went quiet"; second `open mentech` showed Ment'ech not One Solution; unauth `:4111/chat` 401

## 2026-08-17 — Hub Today + mail CRM + Mastra new-file bundle

- **Trigger:** Implement the locked Today / voices / CRM-from-mail plan, then live hub Thread
- **Finding:** Mastra incremental bundle emits `#@/mastra/…` specifiers for **new** files and crashes with `ERR_PACKAGE_IMPORT_NOT_DEFINED`. Re-export new tools from an already-bundled file (list-mail / get-mail / get-daily-brief / propose-triage) and use **relative** imports inside the new file
- **Finding:** A new `@tsu-stack/db` repository import from a freshly chunked tool fails the same way as a new core export: the db ESM cache does not have `mailSmartRuleRepository`. Either rebuild that cache or skip the unused repo
- **Finding:** `chatStream` 200 with only `start-step` / `finish-step` is an empty model turn, not a UI hide bug. Observational memory can already sit at ~21k message tokens; a longer role + voice overlay can produce a 4s empty bubble. Check the SSE, not just the thread
- **Finding:** Unauthenticated `POST :4111/chat/hub-supervisor` is still 401
- **User preference:** GitHub MCP parked; no second login
- **Evidence class:** Agent log `ERR_PACKAGE_IMPORT_NOT_DEFINED` then `mailSmartRuleRepository` missing; Chrome `chatStream` 200 empty; curl 401

## 2026-08-17 — Side panel close vs hide; jobs tools

- **Trigger:** Chevron on the inspect slot; route change; new/tracked jobs conversation
- **Finding:** `collapsed` only hid the slot. `openedItem` stayed set, so the next click on the same experience toggled it closed. Chevron must `dismiss` (clear item + inspect/form hosts + reset collapse)
- **Finding:** Agent inspect lives on the dashboard layout route, so it survives child navigation. Close the panel on `pathname` change
- **Finding:** `searchApplications` + `explainApplicationVsPrefs` let a packed “pile + Trivelta remote vs hybrid” ask land without listing the whole pipeline
- **Finding:** `find-jobs-now` is terminal and hides later text. Pairing it with “tell me the stage” drops the spoken answer; history remount can show “Search is queued” again
- **User preference:** Chevron closes; experience click still opens; test new/tracked jobs
- **Evidence class:** Chrome experiences — open → Close details panel unmounts chevron → reopen; New jobs after nav has no leftover inspect; hub Thread used listNewJobs + explainApplicationVsPrefs

## 2026-08-17 — Project copy must come from analysis

- **Trigger:** User lock: any project change depends on `project.analysis`. Live ask: “is RAYA backend? fix the summary from the notes only”
- **Finding:** `getProject` used to omit `analysis`. The model then invented “backend-first” copy. Confirm must run `projectPatchGroundedInAnalysis` against the full analysis (plus any `patch.analysis` user facts)
- **Finding:** Dumping 8–16k analysis into a tool result can stall the turn (“pulling the record…” then 4–9s and stop). Return `analysisExcerpt` + `analysisHeadings`. Client Confirm still sees full analysis via `projects.get`
- **Finding:** New `@tsu-stack/core` exports crash the agent (`does not provide an export named '…'`) until `rebuild:core-cache`. Prefer a local outline helper in the tool over importing a brand-new core export mid-session
- **Finding:** Accept `id` as an alias for `projectId` — the model often passes `id`
- **User preference:** Project rewrites stay inside analysis facts; no invented stack/employers
- **Evidence class:** Chrome — get Project then “RAYA مش backend… bookings, payments, door access”; File Diff `+` summary leads with bookings/door access; Confirm enabled (grounded); ungrounded invented copy unit-blocked

## 2026-08-16 — Conversation cycles 2–3: 87 then 91

- **Trigger:** Cycle 2 skeptical senior (persist + Trivelta + no rewrite; why remote still applied; Ment’ech title-only plan; one-sentence check). Cycle 3 Franco-Arabic (RAYA + mail + hybrid; show Ment’ech no card; empty pile leave it; one card tomorrow?)
- **Finding:** After inspect-is-terminal, “show me it / show me it” opened the experience panel **once** (“Opened experience…” ×1)
- **Finding:** `listExperiences` still pasted the whole catalog when asked about one title. Named-row get + short delta, never a list dump
- **Finding:** Franco-Arabic (`ya3ni`, `lsa`, `fel mail`, `matghayarsh`, `fi 7aga new fel pile`) mapped without quizzing. Empty pile → `listNewJobs` only, no triage card
- **Finding:** Prefs write is a **forward filter**, not a retroactive dismiss of already-applied rows. The skeptical poke (“why is Trivelta still there”) should stay a spoken answer, not a write
- **User preference:** New persona each long conversation; score 1–100 so prompt/code changes can be compared
- **Evidence class:** Chrome hub Thread; cycle log 77 → 87 → 91

## 2026-08-16 — Conversation cycle 1 (overwhelmed seeker) = 77/100

- **Trigger:** Four everyday turns after leftover HITL cancel: hybrid Cairo + peek last project + job emails; poke for dropped clauses; open the project; “is RAYA still frontend?”
- **Finding:** Same kind+id File Diff after **Cancel** re-POSTs like after Confirm. Treat cancel as settled for that entity this turn; do not resume the leftover
- **Finding:** `open-entity-inspect` on the client-resume list restacks “Opened project…” until Stop. Make inspect terminal (panel is the UI); call once
- **Finding:** A packed ask that writes prefs then `getSearchBrief` often never speaks the other clauses. Answer mail/project **after** (or before) the brief — the File Diff is not the whole turn
- **Finding:** History hydrate remounts incomplete HITL (hard-stop / stack / project) from earlier today. Cancel leftovers before scoring a cycle; one thread per user is not a clean slate
- **Finding:** Workplace “RAYA” as a **project** under Ment’ech was found without “no experiences yet” once the model searched/read instead of listExperiences-only
- **User preference:** Change persona each cycle; score 1–100; adjust before looping
- **Evidence class:** Chrome hub Thread (4 turns); `jobPreference.get` `workModes: [hybrid]`, locations include Cairo; inspect dialog Dev-Hub Overview; cycle log

## 2026-08-16 — Everyday multi-ask: promised card, then re-proposed after Confirm

- **Trigger:** Casual hub chat: “what am I looking for / RAYA still says frontend / Dev-Hub is backend / don’t want RN / anything new in the pile”
- **Finding:** A packed ask can list prefs + inbox + one get, show the brief, then **say** a File Diff is coming and never call `propose-evidence-change`. User has to poke (“i don’t see any card”)
- **Finding:** After Confirm persist (`Updated project` + DB summary changed), auto-resume opened a **second** project File Diff on the same entity. Treat same-id re-propose this turn like hard-stop/triage — next named entity only, or stop
- **Finding:** Model dumps thinking as visible list items (`Wait — maxSteps 16…`). Hide reasoning / thought lists in the thread; they are not the product UI
- **Finding:** Six parallel “Confirm new stack” cards violate one-entity-per-interview. Start with one; after Confirm, ask/queue the next
- **Finding:** `listExperiences` empty + “No experiences yet” is confusing when RAYA lives as a **project** title. Search projects too when they name a workplace
- **Finding:** Unauthenticated `:4111/chat` is 401. Identity brief File Diff (preview, no `+/−`) rendered. Confirm File Diff was `project.md +2/−2` then persist
- **User preference:** Everyday language; do not coach product steps; keep testing multi-tool asks
- **Evidence class:** Chrome hub Thread; `projects.list` Dev-Hub summary starts “Backend-first…”; unauth chat 401

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
