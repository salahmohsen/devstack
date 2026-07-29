# Mail wave (UI mock) — guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `11`–`13`  
**Depends on:** Shell wave (surface + island)

## Shipped (UI only)

| Path                        | Behavior                                          |
| --------------------------- | ------------------------------------------------- |
| `/dashboard/mail`           | Hub cards: categories + smart rules (mock counts) |
| `/dashboard/mail/$category` | Island category nav + message list + reader       |
| Sidebar                     | **Mail** under Dashboard                          |

Mock data: `apps/web/src/pages/dashboard/mail/_lib/mail-mock.ts`

## Out of scope this wave

- Resend inbound / Gmail OAuth sync
- Postgres `mail_message` + Redis classify queue
- Real reply assist / `/dashboard/review`
- Smart rules CRUD

Those are later tickets (backend + AI waves).
