# 39 — Undo deletes auto-created applications

**What to build:** When audit `before.applicationId` is null and `after` has an id, undo unlinks mail and hard-deletes the open auto-created application.

**Blocked by:** 34, 38

**Status:** done

**Parent:** Career Inbox — Match unlinked mail (wave 7).

- [x] `undoMailCrmApply` detects create-from-mail
- [x] `deleteMany` only when application still open
- [x] Stage restore path unchanged for matched existing apps
