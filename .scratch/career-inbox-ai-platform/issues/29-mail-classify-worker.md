# 29 — Mail classify worker (heuristic)

**What to build:** BullMQ worker loads message, runs heuristic classify, persists. No LLM yet.

**Blocked by:** 25 (queue), 27–28

**Status:** done

- [x] `runMailClassify` orchestration
- [x] Worker uses DB ALS (`runWithDb`) per job
- [x] Idempotent on already-classified rows
- [x] Enqueue still from Resend inbound
