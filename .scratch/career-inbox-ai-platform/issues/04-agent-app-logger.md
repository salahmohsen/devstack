# 04 — Wire `@tsu-stack/logger` into the agent app

**Status:** done

**Branch:** `chore/upgrade-evlog-cli` (foundation wave)

- [x] Agent depends on `@tsu-stack/logger` (workspace)
- [x] Stable service name for agent events exists (`LOG_SERVICES.AGENT`)
- [x] Process boot initializes the server logger once (`logger-bootstrap.ts`)
- [x] Terminal wide event on boot path (`agent__process_boot`)
- [x] Conventions in `apps/agent/AGENTS.md` / `.agents/logging.md` still accurate
- [x] No direct `evlog` import in the agent app
- [x] Mastra build succeeds with `apps/agent/.npmrc` legacy-peer-deps for deploy install (evlog/hono peer)
