# 25 — Redis classify queue scaffold

**What to build:** Job queue for mail classify using Redis. Prefer BullMQ on existing `REDIS_URL` / ioredis patterns in `apps/server` — do not invent a parallel Redis stack. Scaffold producer + worker stub that logs job payload; full Mastra classify is a later epic.

**Blocked by:** 22 (message ids exist); 24 can call enqueue

**Status:** done

- [x] Inspect current ioredis usage (`apps/server` runtime, github gateway)
- [x] Queue name + job payload type (`messageId`, `userId`) in `packages/core/src/mail/classify-queue.ts`
- [x] Producer helper callable from webhook (`enqueueMailClassify` in `apps/server/src/queues/mail-classify-queue.ts`)
- [x] Worker process in `apps/server` when `REDIS_URL` set — logs job stub (no full Mastra classify)
- [x] Document run command / env (`REDIS_URL` in `.env.example` + MAIL-BACKEND.md)
