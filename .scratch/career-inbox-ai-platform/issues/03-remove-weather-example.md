# 03 — Remove weather agent, tools, scorers, and workflow

**Status:** done

**Branch:** `chore/upgrade-evlog-cli` (foundation wave)

- [x] Weather agent, tool, scorers, and workflow deleted or fully unregistered
- [x] Hub supervisor no longer delegates to weather or mentions weather as a live capability
- [x] Model-config comments no longer treat weather as a primary example consumer
- [x] `apps/agent/AGENTS.md` still forbids reintroducing weather
- [x] Agent boots without weather registrations; no dangling imports
