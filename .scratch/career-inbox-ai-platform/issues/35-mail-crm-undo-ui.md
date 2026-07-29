# 35 — Mail reader: show auto-stage + undo

**What to build:** When a message has a CRM apply audit, show “Stage updated from mail” (or similar) in reader with Undo. Wire mutation + invalidate applications + mail queries.

**Blocked by:** 34

**Status:** done

**Parent:** Career Inbox — CRM from classify (wave 6).

- [x] Reader surfaces last apply summary from `mail.get` → `crmApply`
- [x] Undo button → mutation → toast + invalidate mail/applications
- [x] No dead ends when no apply exists
