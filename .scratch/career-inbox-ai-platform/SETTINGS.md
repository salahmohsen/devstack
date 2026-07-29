# Settings wave (AI + Notifications) — guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `14`–`19`  
**Depends on:** Shell wave (settings island layout)

## Goal

Per-user **AI settings** (providers, models per feature, reply Assist|Full) and **Notifications** settings (app/email channels, notification email destination). Auto-send lives **only** in AI settings — never under Notifications.

## Shipped when

| Path                                | Behavior                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `/dashboard/settings/ai`            | Providers + model map + mail reply autonomy            |
| `/dashboard/settings/notifications` | App/email toggles by kind + notification email address |
| Island nav                          | AI + Notifications sections                            |

## Out of scope this wave

- Mail backend / Resend inbound / Redis queues
- Real provider API calls from settings (validate keys later)
- Gmail connect (Connections epic)
- Device OTP (later)
- ~~Full notification delivery pipeline (bell + email send)~~ → shipped waves 10 + 14

## Dependency graph

```text
14 (core) ──► 15 (db) ──► 16 (api) ──┬──► 17 (AI UI)
                                     └──► 18 (Notifications UI)
19 (docs) after 17–18
```
