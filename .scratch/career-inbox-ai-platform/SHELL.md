# Shell wave — implementation guide

**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`  
**Tickets:** `issues/07` … `issues/10`  
**Depends on:** Foundation wave (done on `main`)

## Goal

Shared **main surface card** + **darker floating island** + minimal fade-in, proven on **Settings**, ready for Mail hub and Review.

## Implementation

| Piece             | Path                                                           |
| ----------------- | -------------------------------------------------------------- |
| Shell primitives  | `apps/web/src/shared/ui/dashboard-shell.tsx`                   |
| Settings consumer | `apps/web/src/pages/dashboard/settings/ui/settings-layout.tsx` |
| Docs              | `.agents/ui.md` (Dashboard surface + island shell)             |

## Dependency graph

```text
07 surface shell
  └──► 08 darker island
         └──► 09 settings island layout
                └──► 10 docs + reuse contract
```

## Done when

- [x] Settings uses surface + island
- [x] Docs describe reuse
- [x] Components live under `shared/ui/dashboard-shell.tsx`
- [ ] Ready for Mail hub tickets (wave 2)
