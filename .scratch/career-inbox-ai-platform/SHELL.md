# Shell wave — implementation guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `issues/07` … `issues/10`  
**Depends on:** Foundation wave (done on `main`)

## Goal

Shared **main surface card** + **darker floating island** + minimal fade-in, proven on **Settings**, ready for Mail hub and Review.

## Dependency graph

```text
07 surface shell
  └──► 08 darker island
         └──► 09 settings island layout
                └──► 10 docs + reuse contract
```

## Skills while building

- coss / coss-particles
- `.agents/ui.md`, `.agents/tanstack-patterns.md`
- transitions / minimal fade (no heavy bounce)
- `/implement` + `/tdd` + `/code-review`
- Superpowers `writing-plans` per ticket if multi-file

## Done when

- [ ] Settings uses surface + island
- [ ] Docs describe reuse
- [ ] Ready for Mail hub tickets (wave 2)
