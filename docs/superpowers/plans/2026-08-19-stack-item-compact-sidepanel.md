# Stack Item Compact Sidepanel Implementation Plan

> **For agentic workers:** Implement inline on the current branch/folder (no worktree). Do **not** commit unless the user asks. Other agents may be editing unrelated files — stage only stack-item related paths.

**Goal:** Make stack grid cards reflow into a structured horizontal identity band when card width is squeezed by the sidepanel, without changing `ListItemActionButtons`.

**Architecture:** Per-card CSS `@container` queries. Default (narrow) layout is the compact horizontal band; at `min-width: 12rem` the card restores today’s square poster. One shared identity markup path for normal + sort modes; badges hide below the threshold. Action footer markup stays as-is.

**Tech Stack:** React, Tailwind v4 container queries (`@container`, `@[12rem]:`), existing `Card` / `Icon` / `ListItemActionButtons` / `StackIdentityBadges`.

**Spec:** `docs/superpowers/specs/2026-08-19-stack-item-compact-sidepanel-design.md`

---

## File map

| File                                                    | Role                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx` | Primary: `@container`, compact/wide identity reflow, badge hide, `title` parity, overlay padding |
| `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`   | Only if containment must live on the grid cell wrapper (prefer card-local first)                 |

No changes to `list-item-action-buttons.tsx`.

---

### Task 1: Container + compact/wide identity reflow

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`

- [ ] **Step 1:** Add `@container` on the `Card`. Replace always-on `aspect-square` with `@[12rem]:aspect-square`. Tune `contain-intrinsic-size` for shorter compact height (e.g. `[contain-intrinsic-size:auto_7.5rem]`).

- [ ] **Step 2:** Unify identity markup for sort + non-sort into one band that:
  - Default (compact): `flex-row items-center gap-2.5 px-3 py-3`, icon `size-9`, name `truncate text-left` + `title={stack.name}`
  - `@[12rem]:`: `flex-col items-center justify-center gap-2 p-4 pt-8`, icon `size-14`, name `line-clamp-2 text-center`
  - Badges wrapper: `hidden @[12rem]:flex` (sort + non-sort)

- [ ] **Step 3:** Keep non-sort open `button` as the identity click target; sort keeps non-button `CardContent` (or equivalent) with the same identity classes. Action footer block untouched in composition — only ensure it still sits under the band.

- [ ] **Step 4:** Overlay collision — when batch checkbox or sort drag handle is shown (`absolute top-2 left-3`), add leading padding on the identity band (`ps-8` / `@[12rem]:ps-4` as needed) so icon+name do not sit under the control.

- [ ] **Step 5:** Browser-verify on Stacks: sidepanel open (compact), sidepanel closed (square+badges), hover/open action group, batch select, sort drag. Do not commit.

---

### Task 2: Mechanical polish check

- [ ] **Step 1:** Run `node /Users/salah/.grok/skills/impeccable/scripts/detect.mjs --json apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx` and fix unexplained layout findings if any.
- [ ] **Step 2:** Stop. Await user before any git commit.
