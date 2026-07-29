# 31 — Mail → CRM effect contracts

**What to build:** Shared pure contracts for classify → Applications CRM: system label → stage map, monotonic stage resolve, effect proposal + audit snapshot Zod shapes. No DB writes.

**Blocked by:** 27–30 (classify labels exist), applications CRM stages in core.

**Status:** done

**Parent:** Career Inbox — CRM from classify (wave 6).

- [x] `MAIL_SYSTEM_LABEL_TO_STAGE` + rank / max / monotonic helpers
- [x] `proposeMailCrmEffect` pure function
- [x] `MailCrmEffectProposal` / audit snapshot / apply result schemas
- [x] Exported from `packages/core` mail index
