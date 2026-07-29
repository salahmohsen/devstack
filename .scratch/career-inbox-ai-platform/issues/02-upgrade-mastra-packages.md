# 02 — Upgrade Mastra packages and keep agent app building

**What to build:** All Mastra-related catalog versions are current; `apps/agent` builds and its registered workflows/agents still load under the upgraded APIs. Any required migration follows current Mastra docs (Context7 / embedded docs), not memory.

**Blocked by:** None — can start immediately (parallel with 01).

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation.

- [ ] Catalog entries for `mastra`, `@mastra/core`, and other used `@mastra/*` packages bumped and installed
- [ ] Agent package typechecks / `build` (project scripts) succeeds after migration fixes
- [ ] Mastra registration in the agent entrypoint remains complete for remaining agents/workflows/scorers
- [ ] Breaking API changes fixed using installed docs / Context7 — no invented APIs
- [ ] Note any intentional deferred breaks (e.g. weather removal handled in 03) in the PR description
