# 04 — Wire `@tsu-stack/logger` into the agent app

**What to build:** The Mastra agent process emits product/ops **wide events** through `@tsu-stack/logger` (same facade as the rest of the monorepo). At least one real job path (boot lifecycle or an existing workflow terminal outcome) uses createLogger/set/emit correctly. Mastra’s own traces remain for AI debugging; they are not a substitute for these wide events.

**Blocked by:** 01 (logger/evlog catalog stable), 02 (agent builds on new Mastra).

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation.

- [ ] Agent depends on `@tsu-stack/logger` (workspace)
- [ ] Stable service name for agent events exists (e.g. `LOG_SERVICES.agent`) and is used at init
- [ ] Process boot initializes the server logger once
- [ ] At least one terminal wide event on a real path (boot completed or workflow outcome) with structured fields — no secrets
- [ ] Conventions in `apps/agent/AGENTS.md` / `.agents/logging.md` still accurate
- [ ] No direct `evlog` import in the agent app
