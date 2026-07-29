# 25 — Redis classify queue scaffold

**What to build:** Job queue for mail classify using Redis. Prefer BullMQ on existing `REDIS_URL` / ioredis patterns in `apps/server` — do not invent a parallel Redis stack. Scaffold producer + worker stub that logs job payload; full Mastra classify is a later epic.

**Blocked by:** 22 (message ids exist); 24 can call enqueue

**Status:** pending

- [ ] Inspect current ioredis usage (`apps/server` runtime, github gateway)
- [ ] Queue name + job payload type (messageId, userId)
- [ ] Producer helper callable from webhook
- [ ] Worker process or agent-adjacent consumer stub (no full Mastra classify)
- [ ] Document run command / env (`REDIS_URL`)
