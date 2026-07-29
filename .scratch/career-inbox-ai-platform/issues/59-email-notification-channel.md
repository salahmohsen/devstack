# 59 — Email notification channel

**Wave:** 14  
**Depends on:** 50–53 (app notifications), notification settings channels

## Goal

When a kind has `email: true` in Settings → Notifications, `emitAppNotification` also sends a Resend system email to `notificationEmail` (else account email).

## Shipped when

- Template `AppNotificationEmail` in `@tsu-stack/email`
- Emit path honors channel prefs for both app and email
- Email failure never blocks classify / CRM / draft creation
- Docs updated
