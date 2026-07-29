# 02 — Upgrade Mastra packages and keep agent app building

**What to build:** All Mastra-related catalog versions are current; `apps/agent` builds and its registered workflows/agents still load under the upgraded APIs.

**Blocked by:** None

**Status:** done

**Branch:** `chore/upgrade-evlog-cli` (foundation wave)

- [x] Catalog entries for `mastra`, `@mastra/core`, and other used `@mastra/*` packages bumped and installed
- [x] Agent package typechecks / `build` (project scripts) succeeds after migration fixes
- [x] Mastra registration in the agent entrypoint remains complete for remaining agents/workflows/scorers
- [x] Breaking API changes fixed using installed docs / Context7 — no invented APIs
- [x] Weather removal handled in ticket 03 (same branch)

**Verified:** `vp run build` in `apps/agent` → Build successful (Mastra CLI).

**Versions (catalog):** mastra ^1.20.3, @mastra/core ^1.54.0, @mastra/ai-sdk ^1.7.0, @mastra/pg ^1.18.0, @mastra/memory ^1.24.0, @mastra/evals ^1.6.0, @mastra/duckdb ^1.5.2, @mastra/observability ^1.16.3
