# 03 — Remove weather agent, tools, scorers, and workflow

**What to build:** Weather is fully gone from the agent app and hub supervisor. Remaining agents are career/hub-relevant only. Docs that still instruct weather usage as live product behavior are corrected or marked historical.

**Blocked by:** None — can start immediately. Prefer after **02** if the upgrade already touched weather files.

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation.

- [ ] Weather agent, tool, scorers, and workflow deleted or fully unregistered
- [ ] Hub supervisor no longer delegates to weather or mentions weather as a live capability
- [ ] Model-config comments no longer treat weather as a primary example consumer
- [ ] `apps/agent/AGENTS.md` still forbids reintroducing weather
- [ ] Agent boots without weather registrations; no dangling imports
