# 38 — Match/create application in CRM apply worker

**What to build:** When classify yields system labels and message has no `applicationId`, match open apps by company or create a pipeline row, then link + stage (audit as today).

**Blocked by:** 37, 33

**Status:** done

**Parent:** Career Inbox — Match unlinked mail (wave 7).

- [x] Worker uses hints + `findOpenByUserId` + resolve
- [x] Create with stage from labels; source recruiter/other
- [x] Link `mail_message.applicationId`; write audit
- [x] Ambiguous / no hints: skip with log (no force-create)
