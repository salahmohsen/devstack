# 24 — Resend inbound webhook

**What to build:** HTTP endpoint for Resend inbound mail. **BYO per tenant** (not platform `RESEND_WEBHOOK_SECRET`). Settings → Mail stores sealed Resend API key + webhook signing secret + optional inbound address. Map webhook path token → tenant `userId`, verify Svix signature with that user’s secret, fetch body with BYO API key, persist `mail_message`, idempotent on provider delivery id. Enqueue classify job when queue exists (25).

**Blocked by:** 21 (persist); ideally 22 create path solid; 25 optional for enqueue

**Status:** done

- [x] Route `POST /webhooks/resend/:webhookToken` (mirror GitHub webhook style on `apps/server`)
- [x] Signature verification with **per-user** sealed webhook secret (Settings → Mail)
- [x] Tenant resolution: opaque `webhookToken` on `user_mail_settings` (unique URL per account)
- [x] Idempotent insert (`provider` + `providerMessageId` unique per user)
- [x] Persist body/preview via Received emails API; attachment meta stubs if present
- [x] Product `EMAIL_FROM` → purpose `system_notification` (hidden from default Career Inbox lists)
- [x] Settings → Mail UI for BYO Resend keys + webhook URL copy/rotate
