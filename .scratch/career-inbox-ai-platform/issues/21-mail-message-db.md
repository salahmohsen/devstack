# 21 — mail_message DB schema

**What to build:** Drizzle `mail_message` (+ optional attachment meta) with tenant `userId`, labels, purpose, ingress identity for idempotency, indexes by user + receivedAt + labels. Generate migration; apply **only** when `DATABASE_URL` is local.

**Blocked by:** 20

**Status:** done

- [x] Schema under `packages/db/src/schema/mail-message.schema.ts`
- [x] Attachment meta table (filename, contentType, size, storageKey) if needed
- [x] Indexes: userId, (userId, receivedAt), purpose, unique ingress key
- [x] Types exported under `packages/db/src/types`
- [x] Migration generated + applied on local DB only
