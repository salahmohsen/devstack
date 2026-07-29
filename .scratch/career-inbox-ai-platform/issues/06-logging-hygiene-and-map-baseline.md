# 06 — Logging hygiene and first `evlog map` baseline for web

**What to build:** Request/job logging follows emit-once and wide-event rules (no known double-emit middleware bugs introduced or left unfixed on critical paths). Operators can run `evlog map` against the TanStack Start web app and capture a baseline score; sensitive routes (auth-related) are not ignored without documented disable comments.

**Blocked by:** 01 — CLI and scripts available.

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation.

- [ ] Spot-check Hono / TanStack request logger middleware for post-emit / double-wrap issues per `.agents/logging.md`; fix high-severity ones found
- [ ] `evlog map` runs for web with correct framework detection or `--framework tanstack-start`
- [ ] Baseline score recorded (PR description or committed `evlog.map.json` only if team chooses the ratchet approach)
- [ ] Health/log-ingest endpoints that should stay dark use official disable comments if map fails them wrongly
- [ ] No drive-by logging spam added “to raise score”
