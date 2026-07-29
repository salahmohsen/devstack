# 34 — Undo CRM auto-apply (oRPC)

**What to build:** Protected procedure to undo a mail CRM apply by audit id (restore before snapshot, set `undoneAt`). Optional: record correction payload stub for learning wave.

**Blocked by:** 32–33

**Status:** done

**Parent:** Career Inbox — CRM from classify (wave 6).

- [x] `mail.undoCrmApply` protected
- [x] Tenant-scoped; restore stage/outcome/link from `before`
- [x] Typed NOT_FOUND / ALREADY_UNDONE / RESTORE_FAILED errors
- [x] Core input/output schemas; `mail.get` includes active `crmApply`
