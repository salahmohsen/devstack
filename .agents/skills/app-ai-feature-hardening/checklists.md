# Feature-type checklists

Use the sections that match the change. Skip irrelevant sections explicitly in the report.

## A. AI job / Mastra workflow (detect, organize, import, mail process)

- [ ] Job starts from each documented entry path
- [ ] Progress UI/toast updates without remount thrash
- [ ] Cancel aborts remote run (no orphan success toast)
- [ ] Failure surfaces product error (not raw provider dump)
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

## D. Hub chat / assistant-ui

- [ ] History hydrate does not wipe in-flight messages incorrectly
- [ ] Load-older prepends without scroll jump disasters
- [ ] get-by-id tools never called with `{}` (list first)
- [ ] maxSteps / final-response processor still produces a user-visible answer
- [ ] Floater vs home Thread share one provider/thread id when designed that way
- [ ] Client enqueue tools (`find-jobs-now`, `get-search-brief`) do not auto-resume while wrap-up text is streaming, and remounts do not re-enqueue
- [ ] `open-entity-form` only hosts the last assistant turn; history hydrate does not remount scrollback sheets

## E. Unsaved / discard UX

- [ ] Outside click, Escape, X, footer Close all use the **same** guard
- [ ] Guard is coss **AlertDialog** (Keep / Discard), not `window.confirm`
- [ ] Discard clears or keeps state as product intends; Keep leaves dialog open
- [ ] Empty / no-selection close does not false-prompt (unless product wants always confirm)

## F. Auth / integrations

- [ ] Logged-out / expired session fails closed with clear UX
- [ ] GitHub private features tested with working OAuth (or blocked with message)
- [ ] BYO AI missing soft-fails as designed (no hard crash)

## G. After hardening (always)

- [ ] Feedback loop re-run green on original failure
- [ ] LESSONS.md entry appended
- [ ] No secrets in lessons or logs committed
