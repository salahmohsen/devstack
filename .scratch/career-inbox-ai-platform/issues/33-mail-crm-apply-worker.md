# 33 — Apply CRM effects from classify worker

**What to build:** After labels are persisted, propose CRM effect; if application linked, advance stage monotonically and write audit row. Match-by-company or auto-create application is **out of scope** unless already linked — log `unlinked_needs_match` for later.

**Blocked by:** 29–31, 32

**Status:** done

**Parent:** Career Inbox — CRM from classify (wave 6).

- [x] `runMailClassify` calls `applyMailCrmEffectFromClassify` after classification
- [x] When `applicationId` on message + `advance_stage`: update application stage via repository
- [x] Persist audit snapshot (before/after) in `mail_crm_apply`
- [x] Idempotent: skip if active audit exists for message
- [x] Never downgrade stage; never mutate closed applications; unlinked only logs
