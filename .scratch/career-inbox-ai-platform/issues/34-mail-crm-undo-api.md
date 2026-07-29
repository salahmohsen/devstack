# 34 — Undo CRM auto-apply (oRPC)

**What to build:** Protected procedure to undo a mail CRM apply by audit id (restore before snapshot, set `undoneAt`). Optional: record correction payload stub for learning wave.

**Blocked by:** 32–33

**Status:** pending

**Parent:** Career Inbox — CRM from classify (wave 6).

- [ ] `mail.undoCrmApply` (or `applications.undoMailCrmApply`) protected
- [ ] Tenant-scoped; restore stage/outcome/link from `before`
- [ ] Typed NOT_FOUND / ALREADY_UNDONE errors
- [ ] Core input/output schemas
