# 32 — Mail CRM apply audit DB

**What to build:** Drizzle table for auto-applied CRM effects (before/after snapshots, messageId, applicationId, userId, undoneAt) so undo is possible. Repository create + markUndone + findById for tenant.

**Blocked by:** 31

**Status:** done

**Parent:** Career Inbox — CRM from classify (wave 6).

- [x] Schema `mail_crm_apply` under `packages/db`
- [x] Migration generated + applied on local `localhost` only
- [x] Repository: create, findByIdForUser, findByMessageId, findActiveByMessageId, markUndone
- [x] Types exported; relations wired
