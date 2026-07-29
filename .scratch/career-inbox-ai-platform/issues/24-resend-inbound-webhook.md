# 24 — Resend inbound webhook

**What to build:** HTTP endpoint for Resend inbound mail. Verify signature when Resend docs pattern exists (`RESEND_WEBHOOK_SECRET`). Map recipient → tenant `userId`, normalize + persist `mail_message`, idempotent on provider delivery id. Enqueue classify job when queue exists (25).

**Blocked by:** 21 (persist); ideally 22 create path solid; 25 optional for enqueue

**Status:** pending

- [ ] Route e.g. `POST /webhooks/resend` (mirror GitHub webhook style on `apps/server`)
- [ ] Signature verification + env wiring (`RESEND_WEBHOOK_SECRET`)
- [ ] Tenant resolution strategy documented (plus-address / catch-all / mapping table — pick one)
- [ ] Idempotent insert (`provider` + `providerMessageId` unique per user)
- [ ] Persist body/preview; attachment meta stubs if present
- [ ] Do not surface system product mail as career rows if identity matches notification From
