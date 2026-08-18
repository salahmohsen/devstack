# Status morph toggle (portfolio status dot)

**Date:** 2026-08-18  
**Status:** Approved for implementation  
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

App-agnostic **presentational** morph (not a button). Export:

`@tsu-stack/ui/components/status-morph-toggle` → `StatusMorphToggle`

**Interaction ownership:** the parent supplies the pressable surface (`Button`). `StatusMorphToggle` must **not** render a nested `<button>` or own `onClick` / `aria-pressed` — that avoids button-in-button and matches today’s `LiveStatusDot` inside `Button`.

**Props:**

- `active: boolean` — which idle color to use (and which opposite color to preview on hover).
- `className?` — optional layout hooks.
- Optional `size?: "sm" | "md"` (or fixed px) so idle circle fits the icon button (~`size-2` / 8–10px idle, morph proportionally). Defaults sized for icon-sm buttons.
- Optional controlled `hovered?: boolean` from the parent pressable (preferred for icon buttons inside `IconSwap`). When set, the morph does not attach its own mouse handlers.

**Motion / color:**

- `motion/react` spring morph adapted from SmoothUI: full `borderRadius`, idle square→circle, hover taller/narrower pill; `useReducedMotion`; enable morph only when `(hover: hover) and (pointer: fine)`.
- Solid fills: `bg-success` when active, `bg-destructive` when inactive (and the inverse while hovering). Do **not** use Lucide `Circle` + `fill-*`; do **not** use SmoothUI `--color-brand`.
- `active` is controlled by the parent. Hover preview prefers parent-driven `hovered` (whole button hit area); uncontrolled self-hover is only a fallback.

### `apps/web` — `PortfolioStatusButton`

Keep in `list-item-action-buttons.tsx` (or extract beside it if the file grows):

- Existing outline icon `Button` + `Tooltip` own click, `disabled`, `aria-label`, `aria-pressed`.
- Render `StatusMorphToggle` (or spinner via `IconSwap`) as the button child.
- Tooltip copy unchanged: “On your public profile” / “Not on your public profile”.
- Optimistic: local boolean synced from `inPortfolio`, flipped in the button `onClick` before/alongside `onToggle()`; when props catch up or roll back after error, local state follows `inPortfolio`.

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
