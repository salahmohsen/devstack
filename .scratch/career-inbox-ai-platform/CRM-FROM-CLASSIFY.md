# CRM from classify — wave 6 guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `31`–`36`  
**Depends on:** Classify wave (`27`–`30`), Applications CRM stages

## Goal

After Career Inbox classify labels land, **auto-apply** pipeline stage effects when a message is already linked to an application — with **audit + undo**. No silent stage changes without a reversible trail.

## Shipped when

| Seam             | Behavior                                                                       |
| ---------------- | ------------------------------------------------------------------------------ |
| Core contracts   | Label → stage map, monotonic resolve, `proposeMailCrmEffect`, undo I/O schemas |
| `mail_crm_apply` | Before/after JSON snapshots; partial unique active apply per message           |
| Classify worker  | After labels: propose + apply stage when linked; log unlinked for match later  |
| oRPC undo        | `mail.undoCrmApply` restores `before`, sets `undoneAt`                         |
| Reader UI        | Banner when active apply; **Undo** invalidates mail + applications             |

## Out of scope (later)

- Match/create application from unlinked mail (`unlinked_needs_match`)
- Learning / corrections / few-shot
- Reply Review queue
- Calendar events from mail

## Ops notes

- Prod/local: run `mail_crm_apply` migration before relying on audit/undo.
- Inbound still requires Accept inbound + BYO secrets (Settings → Mail).
