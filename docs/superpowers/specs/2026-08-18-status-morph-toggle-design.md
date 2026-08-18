# Status morph toggle (portfolio status dot)

**Date:** 2026-08-18  
**Status:** Draft (design approved in brainstorm; awaiting spec review)  
**Branch:** `main` (implement on main; no worktree)

## Goals

- Shared status indicator that morphs like [SmoothUI Dot Morph Button](https://smoothui.dev/docs/components/dot-morph-button): circle at rest, taller/narrower pill on hover (pointer-fine devices only).
- Color encodes boolean state: **active** = success green, **inactive** = destructive red.
- Hover **previews the opposite** color while morphing.
- Click uses **optimistic** local state; settle back to a circle tinted for the new state.
- First consumer: portfolio status icon button on list/group item actions (experiences, projects, stacks).

## Non-goals

- Replacing overflow-menu `Switch` rows for “In portfolio” / “Featured”.
- Labeled Active/Inactive pill variant (icon-only + tooltip only).
- Installing SmoothUI registry / `SmoothButton` dependency.
- App-wide migration of every unrelated toggle/switch.
- New unit tests unless explicitly requested.

## Interaction model

| Phase                                  | Shape                   | Color                           |
| -------------------------------------- | ----------------------- | ------------------------------- |
| Idle, `active=true`                    | Circle                  | Success                         |
| Hover while active                     | Morph (taller/narrower) | Destructive (preview inactive)  |
| Idle, `active=false`                   | Circle                  | Destructive                     |
| Hover while inactive                   | Morph                   | Success (preview active)        |
| Reduced motion / touch (no hover:fine) | Stay circle             | Follow `active` only (no morph) |

**Click:** flip optimistic `active` immediately; parent still receives `onToggle` / mutation. Dot settles to circle in the new color. If the parent rolls `inPortfolio` back after an error, the control syncs from props and the dot follows.

**Loading:** existing `IconSwap` spinner while `isLoading` remains; morph control hidden under spinner (same as today’s `LiveStatusDot` ↔ loader swap).

## Component placement

### `packages/ui` — `StatusMorphToggle`

App-agnostic presentational control (extract rule: reusable + no app routing/auth).

Suggested export: `@tsu-stack/ui/components/status-morph-toggle` (name may be `StatusMorphToggle`).

**Props (conceptual):**

- `active: boolean` — controlled state color source of truth from parent (after sync).
- `onPressedChange?: (next: boolean) => void` and/or click handler — parent owns mutation.
- `className?`, `disabled?`, sizing suitable for nesting inside icon `Button`.
- Uses `motion/react` (`motion` already in `packages/ui`): spring morph adapted from SmoothUI (`borderRadius` full, idle ~16×16 → hover ~12×28 scaled to icon size), `useReducedMotion`, `(hover: hover) and (pointer: fine)` gate.
- Fill via theme tokens (`bg-success` / `bg-destructive` or equivalent CSS vars) — **not** SmoothUI `--color-brand`.

The control may own a brief internal hover flag only; **active** remains controlled. Optimistic flip lives in the app wrapper so list rows stay in sync with `inPortfolio` props / query cache.

### `apps/web` — `PortfolioStatusButton`

Keep in `list-item-action-buttons.tsx` (or extract beside it if the file grows):

- Wrap `StatusMorphToggle` inside existing outline icon `Button` + `Tooltip`.
- Tooltip copy unchanged: “On your public profile” / “Not on your public profile”.
- Optimistic: local state initialized from `inPortfolio`, sync on prop change, flip on click before/alongside `onToggle()`.
- `aria-pressed` reflects optimistic/active value; `aria-label` stays the hint string.

Remove private `LiveStatusDot` once unused.

## Call sites (this change)

- `PortfolioStatusButton` used via `ListItemActionButtons` `togglePortfolio` — experiences, projects, stacks list/group actions.

No menu Switch changes.

## Dependencies

- `motion` (already present in `packages/ui` / `apps/web`).
- No new SmoothUI packages.

## Out of scope / follow-ups

- Labeled `density="labeled"` variant.
- Deduplicating featured toggle into the same morph control.
- Formal Storybook page (optional later).
