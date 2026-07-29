# App + email notifications — guide

**Tickets:** `50`–`53` (in-app), `59`–`60` (email channel)  
**UI:** dashboard topbar bell · Settings → Notifications

## Goal

Durable **in-app** notifications and optional **email** delivery for career events, gated by Settings → Notifications channel prefs (`app` / `email` per kind).

## Emit points

| Kind                        | When                                  |
| --------------------------- | ------------------------------------- |
| `mail.classified.important` | Classify applies system career labels |
| `mail.reply.draft_ready`    | New pending reply draft created       |
| `application.stage_auto`    | CRM apply/create from mail            |

Entry: `emitAppNotification` in `@tsu-stack/api` — reads prefs, inserts bell row when `app`, sends Resend mail when `email`.

## Email channel (wave 14)

| Piece       | Detail                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| Destination | `user_notification_settings.notification_email`, else account email             |
| Template    | `AppNotificationEmail` (`@tsu-stack/email`)                                     |
| CTA         | Absolute URL from `VITE_WEB_URL` + relative `href`                              |
| Failure     | Swallowed — never fails classify / CRM / draft create                           |
| Defaults    | `mail.reply.draft_ready` + `security.new_device_otp` email on; others email off |

Requires `RESEND_API_KEY` (and optional `EMAIL_FROM`). Without the key, `sendEmail` no-ops.

## API

- `notifications.list` → items + unreadCount
- `notifications.markRead` / `markAllRead`
- `notificationSettings.get` / `update` → channel toggles + destination email

## Out of scope

- Toast policy matrix
- Real-time websocket push (poll 60s on bell)
- Digest / batching
