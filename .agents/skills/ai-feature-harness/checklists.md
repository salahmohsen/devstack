# Feature-type checklists

Use the sections that match the change. Skip irrelevant sections explicitly in the report.

## A. AI job / Mastra workflow (detect, organize, import, mail process)

- [ ] Job starts from each documented entry path
- [ ] Progress UI/toast updates without remount thrash
- [ ] Cancel aborts remote run (no orphan success toast)
- [ ] Failure (tool, model, worker-down) surfaces a product error, not a raw provider dump
- [ ] Soft AI failure still yields reviewable output where designed
- [ ] Intermediate steps do not **drop** earlier good data (match → dedupe → format)
- [ ] Final payload schema matches web consumer
- [ ] Icons/names/confidence sane for known packages (if stacks)
- [ ] Multi-product npm scopes stay separate products; mono-product scopes may merge
- [ ] Re-run after fix uses the **same** entry path that failed

## B. Dual-entry + attach / persist

- [ ] List/menu path persists side effects (not only form-local state)
- [ ] Form path merges into form **and** does not break list path
- [ ] Partial update APIs accept "only the field that changed" (no empty SQL SET)
- [ ] Optimistic cache + invalidation leave list/detail consistent
- [ ] Host for review dialogs survives navigation / sheet unmount

## C. HITL cards (propose, triage, package approval)

- [ ] Card renders with real tool args (no empty ids)
- [ ] Confirm / reject updates server + UI
- [ ] Uncheck/deselect rows respected
- [ ] Agent does not invent success after reject
- [ ] Related lists (New/Tracked/Dismissed) refresh via existing sync hooks
- [ ] Toolkit registration name matches stream tool name
- [ ] No assistant wrap-up text after a pending confirmation card (card is the UI; hide leftover “awaiting confirmation” if the model still writes it)
- [ ] Silent card-only turns (Today, search brief, no `listNewJobs` / leak text) must not invent a New jobs receipt from inbox
- [ ] Evidence: one waiting File Diff; same kind+id after Confirm is hidden (next _named_ entity still locks)
- [ ] Agent never promises a card without calling the propose tool this step

## D. Hub chat / assistant-ui

- [ ] History hydrate does not wipe in-flight messages incorrectly
- [ ] Load-older prepends without scroll jump disasters
- [ ] get-by-id tools never called with `{}` (list first)
- [ ] maxSteps / final-response processor still produces a user-visible answer
- [ ] Floater vs home Thread share one provider/thread id when designed that way
- [ ] Client enqueue tools (`find-jobs-now`, `get-search-brief`) do not auto-resume while wrap-up text is streaming, and remounts do not re-enqueue
- [ ] `open-entity-form` only hosts the last assistant turn; history hydrate does not remount scrollback sheets
- [ ] Chat body sends `memory: { thread, resource }` (`hubChatMemoryOptions`). One thread per user — not a new thread per message
- [ ] After a long everyday conversation: score the cycle 1–100 in [conversation-cycles.md](conversation-cycles.md) and adjust before the next persona
- [ ] A spoken “I’ll pull / list / open X” this turn has the matching tool part (not text-only). Hide the prelude if the tool exists
- [ ] Catalog list tools the product treats as UI (`listExperiences`, `listStacks`, …) have a standalone toolkit renderer. Do not rely on collapsed Agent Activity
- [ ] Working-strip-only tools still leave a readable completed row (not just `Thought for 0s` on the latest turn)
- [ ] On prod/hydrate: `listHubMessages.uiMessages` tool parts vs painted DOM (`data-hitl-kind`, timeline, stack catalog, Agent Activity). Mapper-ok + empty DOM is a render bug

## E. Unsaved / discard UX

- [ ] Outside click, Escape, X, footer Close all use the **same** guard
- [ ] Guard is coss **AlertDialog** (Keep / Discard), not `window.confirm`
- [ ] Discard clears or keeps state as product intends; Keep leaves dialog open
- [ ] Empty / no-selection close does not false-prompt (unless product wants always confirm)

## F. Auth / integrations

- [ ] Logged-out / expired session fails closed with clear UX
- [ ] GitHub private features tested with working OAuth (or blocked with message)
- [ ] BYO AI missing soft-fails as designed (no hard crash)

## G. Agent runtime readiness

Use when the change touches Mastra HTTP, tools, memory, BYO, or agent auth. Full probes: [runtime-hardening.md](runtime-hardening.md). Skip in the report when the change is UI-only.

- [ ] Unauthenticated agent `/chat` and generate are 401/403 (not a model call)
- [ ] Agent `public:` routes stay health/OpenAPI; `:4111` is not exposed without auth
- [ ] No provider API keys in agent env; BYO via Settings → `requestContext` / `input.llm`
- [ ] No session tokens or BYO keys in logs / `LESSONS.md`
- [ ] Tool inputs are Zod-validated; get-by-id never runs on `{}`
- [ ] Chat/generate payloads cap size (count + string length)
- [ ] `mapUserToResourceId` owns `resource`; foreign session cannot read this thread
- [ ] You read Studio / `:4111` / evlog for the failing turn (do not ask the user to paste)
- [ ] Scorers (if this flow has them) are registered with explicit `sampling` — not AgentCore evals
- [ ] After new `@tsu-stack/core` exports: core cache rebuilt / package `dev` restarted
- [ ] Prod: evlog `version` is not proof of the running image — match Dokploy deploy SHA. `autoDeploy: false` means you must deploy
- [ ] Structured-output Zod for LLM payloads is **loose** (optional/coerced enums). Strict sanitize after parse — a missing `band` must not 500 the stream

## H. After hardening (always)

- [ ] Feedback loop re-run green on original failure
- [ ] LESSONS.md entry appended
- [ ] No secrets in lessons or logs committed
