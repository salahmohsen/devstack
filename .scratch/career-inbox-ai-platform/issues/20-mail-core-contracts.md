# 20 — Mail core contracts

**What to build:** Shared Zod enums/schemas and constants in `packages/core` for Career Inbox categories, system career labels, purpose (career vs system notification), list/read transport shapes. Align with mail UI mock categories.

**Blocked by:** None (settings + mail UI done).

**Status:** done

**Parent:** Career Inbox — Mail backend wave (epic 5 / wave 4).

- [x] `packages/core/src/mail/` — categories, system labels, purpose, list/get schemas
- [x] Category ↔ system-label mapping + Unsorted helper
- [x] Default list excludes system notification purpose (schema flag)
- [x] Export from `packages/core` index
