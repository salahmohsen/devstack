# App notifications — wave 10 guide

**Tickets:** `50`–`53`  
**UI:** dashboard topbar bell

## Goal

Durable **in-app** notifications driven by career events, gated by Settings → Notifications channel prefs (`app`).

## Emit points

| Kind                        | When                                  |
| --------------------------- | ------------------------------------- |
| `mail.classified.important` | Classify applies system career labels |
| `mail.reply.draft_ready`    | New pending reply draft created       |
| `application.stage_auto`    | CRM apply/create from mail            |

## API

- `notifications.list` → items + unreadCount
- `notifications.markRead` / `markAllRead`

## Out of scope

- Email channel delivery for these kinds (prefs stored; send later)
- Toast policy matrix
- Real-time websocket push (poll 60s on bell)
