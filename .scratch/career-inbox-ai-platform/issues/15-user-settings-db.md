# 15 — User AI + notification settings DB

**What to build:** Drizzle tables (tenant `userId`) for AI settings and notification preferences. Repository get-or-default / upsert. Keys never returned plaintext in list APIs later — store encrypted or hashed secret material with mask metadata.

**Blocked by:** 14

**Status:** done

- [x] Schema(s) under `packages/db/src/schema/`
- [x] Migration generated + applied on dev DB only after URL check (`localhost`)
- [x] Repository: findByUserId, upsert
- [x] Types exported for core/API mappers
