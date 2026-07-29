# Foundation wave — implementation guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md` (Approved)  
**Tickets:** `issues/01` … `issues/06`  
**Skills while building:** `mastra` skill, Context7 for evlog + Mastra, `.agents/logging.md`, `apps/agent/AGENTS.md`, `/implement` + `/tdd` + `/code-review`

## Goal

Make the monorepo safe to build Career Inbox on: current **evlog** + **Mastra**, no weather demo, agent **wide events** via `@tsu-stack/logger`, **Axiom** ready for ops logs, CLI **map/doctor** usable.

## Non-goals (this wave)

- Career Inbox UI/backend
- PostHog product/error SDKs (later; design freezes PH as product/errors, Axiom as logs)
- Redis queues, mail, review page

## Dependency graph

```text
01 ──┬──► 04
     ├──► 05
     └──► 06
02 ──┬──► 04
     └──► 03 (soft: prefer after 02)
03 (none hard)
```

## Suggested branches

| Ticket | Branch idea                  |
| ------ | ---------------------------- |
| 01     | `chore/upgrade-evlog-cli`    |
| 02     | `chore/upgrade-mastra`       |
| 03     | `chore/remove-weather-agent` |
| 04     | `chore/agent-logger`         |
| 05     | `chore/logger-axiom-drain`   |
| 06     | `chore/logging-hygiene-map`  |

Merge order flexible for 01/02/03; land 04 after 01+02; 05/06 after 01.

## Done when

- [ ] All six tickets acceptance criteria checked
- [ ] Agent builds without weather
- [ ] Doctor + map runnable for web
- [ ] Axiom optional in prod via env
- [ ] Ready to open Shell wave tickets (surface + island)
