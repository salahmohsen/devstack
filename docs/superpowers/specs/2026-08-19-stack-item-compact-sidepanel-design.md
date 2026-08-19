# Stack item compact sidepanel layout

**Date:** 2026-08-19  
**Status:** Approved (brainstorm)  
**Surface:** Dashboard → Stacks grid cards (`apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`)  
**Related:** `ListItemActionButtons` (frozen), `stacks-page.tsx` grid column classes

## Problem

When the dashboard sidepanel opens, the stacks grid keeps the same column count (stable viewport breakpoints so cards do not rearrange). Each card’s width shrinks while the card stays `aspect-square` with a large centered icon, multi-line name, and identity badges. Under that squeeze:

- Stack names truncate into unreadable ellipsis or disappear optically.
- The grid reads as an unstructured “party of items” — equal-weight tiles with no clear scan line.

The primary failure to fix is **structure under squeeze**, not merely “show more characters.”

## Goals

1. Under sidepanel squeeze, each card must feel like a structured unit: clear identity band + stable action footer.
2. Stack **name** remains scannable (with `title` for the full string when truncated).
3. **Do not change** the action button group: same `ListItemActionButtons` composition and API (edit, select, toggle portfolio, toggle featured, delete / overflow). Layout chrome around the group may adjust (padding, centering) so it still fits.
4. Wide (comfortable) card widths keep today’s square poster layout so the open grid does not lose its current personality.

## Non-goals

- Changing grid column breakpoints / column counts when the panel opens.
- Switching the stacks page to a Projects-style list of rows.
- Redesigning or reordering `ListItemActionButtons`.
- Changing sidepanel width behavior, batch-select, context menu contents, or detail panel chrome.
- New badges, metadata rows, or actions on the card.

## Spatial thesis

- **Wide card:** square poster — centered icon, name, identity badges, action footer (current topology).
- **Compact card:** short horizontal identity band (leading icon + truncating name) over the **same** action footer; drop forced square aspect so height follows content.
- Switch is driven by **per-card container query** (card width), not by a global “sidepanel open” flag or viewport breakpoint. That way resize-handle narrowing and sidepanel open share one adaptation path.

## Behavior

### Trigger

- Make the stack card (or its immediate grid cell wrapper) a containment context (`@container`).
- Compact layout when the card’s container width is below approximately **11–12rem** (exact token tuned in implementation against real sidepanel + `grid-cols-*` widths; document the chosen value in code).
- Above that threshold: wide (current) layout.

### Compact layout

| Zone          | Content                          | Notes                                                              |
| ------------- | -------------------------------- | ------------------------------------------------------------------ |
| Identity band | Icon (~36px) + name              | Single horizontal row; name `truncate` + `title={stack.name}`      |
| Badges        | Hidden                           | Type / featured / project-count not shown in compact               |
| Action footer | Existing `ListItemActionButtons` | Unchanged composition; keep footer height ~`h-10`; center as today |

The compact identity band remains the primary open/view click target (same role as today’s centered content `button`). The action footer stays a separate stopPropagation zone.

### Wide layout

- Preserve current centered icon (`size-14`), `line-clamp-2` name, `StackIdentityBadges`, and footer action strip behavior (opacity on hover / open / batch).
- Add `title={stack.name}` on the wide name as well (parity with sort mode and compact).

### Sort mode

- Sort mode uses the same compact ↔ wide identity adaptation.
- Drag handle and batch checkbox must not collide with the compact identity band: plan must pick a concrete fix (corner overlays with padding, or a reserved leading slot) — not leave it unspecified.

### Selection / open

- Keep selected/open affordance (`ring-1 ring-primary/40` / `data-selected`).
- Action footer visibility rules (always visible when open or batch-active; otherwise hover/focus-within) stay as today.

## Implementation sketch (non-binding)

Primary file: `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`.

Likely touch points:

1. Add `@container` on the card or the `animate-grid-item` wrapper in `stacks-page.tsx`.
2. Replace hard `aspect-square` with conditional classes, e.g. default square at comfortable widths; `@[…]:` / container-query variants for compact auto-height horizontal band.
3. Conditionally hide `StackIdentityBadges` in compact (CSS or a single structural branch that still shares one action footer).
4. Ensure `contain-intrinsic-size` still reasonable for `content-visibility: auto` after height change.

No changes to `list-item-action-buttons.tsx` unless a pure layout className passthrough already supported is needed (prefer not).

## Success criteria

- With sidepanel open at typical desktop widths, stack **names remain readable** across the visible grid.
- Cards align as a calm shelf (shared identity edge + shared footer), not a party of cramped squares.
- Action button group markup, actions, and tooltips/menus behave identically to today.
- With sidepanel closed on a wide viewport, cards still look like today’s square stack tiles (icon + badges).
- Sort mode and batch select still work without clipped handles or overlapping controls.

## Verification

- Browser: Stacks page, open a stack (sidepanel), resize panel width across the compact threshold; confirm name + structure.
- Browser: Sidepanel closed / wide — square poster + badges still present.
- Browser: Hover / open / batch — action group visibility unchanged; click edit / portfolio / featured / delete / overflow.
- Browser: Sort mode drag + compact cards.
- Mechanical: `node …/impeccable/scripts/detect.mjs --json` on changed stack item files after UI lands.
