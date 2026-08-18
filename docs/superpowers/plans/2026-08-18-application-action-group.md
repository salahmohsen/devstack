# Application Action Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared coss Group for tracked-jobs actions: board `[Magic | ▾]`, list/panel `[Magic | Edit | ▾]`; remove board ⋮; hide matching primary from chevron menu.

**Architecture:** New `ApplicationActionGroup` composes primary CTA(s) + MenuTrigger chevron. `ApplicationItemActions` accepts `hidePrimaryKind`. Wire board, list, side-panel header.

**Tech Stack:** React, coss `Group` / `GroupSeparator` / `Menu`, existing `ApplicationPrimaryActionButton` + `getApplicationPrimaryAction`.

**Spec:** `docs/superpowers/specs/2026-08-18-application-action-group-design.md`

**Branch:** **`main`** (no worktree).

**Do not add unit tests** unless requested.

---

## File map

| Path                                                                        | Role                         |
| --------------------------------------------------------------------------- | ---------------------------- |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/application-action-group.tsx` | **Create** shared Group      |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/application-item-actions.tsx` | `hidePrimaryKind`            |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/board.tsx`                    | Remove ⋮; use Group `board`  |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx`                     | Desktop + mobile `with-edit` |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`   | Header `with-edit`           |

---

### Task 1: `hidePrimaryKind` on ApplicationItemActions

**Files:**

- Modify: `application-item-actions.tsx`

- [ ] **Step 1: Add prop and filter**

```ts
import {
  getApplicationPrimaryAction,
  type ApplicationPrimaryActionKind,
  ...
} from "@/features/applications";

// props:
hidePrimaryKind?: ApplicationPrimaryActionKind | null;

// When rendering ApplyPackageMenuItems / Open listing / Add JD equivalents:
// - Open listing Item: skip if hidePrimaryKind === "open-listing"
// - ApplyPackageMenuItems: pass hidePrimaryKind or filter inside so Prepare/Review/Send/Add JD matching kind is omitted
```

Implement by either:

1. Teaching `ApplyPackageMenuItems` an optional `hidePrimaryKind`, **or**
2. Mapping primary kinds to which menu entries to skip in `ApplicationItemActions` only for the Open listing item, and extending `ApplyPackageMenuItems` for package entries.

Minimal: add `hidePrimaryKind` to both `ApplicationItemActions` and `ApplyPackageMenuItems`.

Open listing is rendered in `ApplicationItemActions` — gate it. Package prepare/review/send/add-jd live in `ApplyPackageMenuItems` — gate those `Item`s when `entryState` actions match `hidePrimaryKind`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/application-item-actions.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions.tsx
git commit -m "feat(web): hide matching primary from application menus"
```

---

### Task 2: Create `ApplicationActionGroup`

**Files:**

- Create: `application-action-group.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { ChevronDownIcon, PencilIcon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { getApplicationPrimaryAction } from "@/features/applications";
import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  ApplicationItemActions,
  applicationListMenuSlots,
  applicationMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";
import { ApplicationPrimaryActionButton } from "@/pages/dashboard/tracked-jobs/ui/application-primary-action-button";

type ApplicationActionGroupProps = {
  app: ApplicationOutput;
  variant: "board" | "with-edit";
  className?: string;
  /** Menu slot adapters: board uses applicationMenuSlots; list uses applicationListMenuSlots. */
  menuSlots?: "board" | "list";
};

export function ApplicationActionGroup({
  app,
  variant,
  className,
  menuSlots = variant === "board" ? "board" : "list"
}: ApplicationActionGroupProps) {
  const { openEdit } = useApplicationStore();
  const primary = getApplicationPrimaryAction(app);
  const slots = menuSlots === "list" ? applicationListMenuSlots : applicationMenuSlots;
  const density = variant === "with-edit" ? "list-overflow" : "full";

  return (
    <Group
      aria-label="Item actions"
      className={cn(variant === "board" && "mt-2.5 w-full", className)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {primary ? (
        <ApplicationPrimaryActionButton
          app={app}
          layout={variant === "board" ? "card" : "inline"}
          className={cn(
            "active:scale-[0.96]",
            variant === "board" && "mt-0 h-7 min-w-0 flex-1 rounded-none",
            variant === "with-edit" && "min-w-0"
          )}
        />
      ) : null}
      {primary ? <GroupSeparator /> : null}
      {variant === "with-edit" ? (
        <>
          <Button
            type="button"
            size={variant === "with-edit" ? "default" : "sm"}
            variant="default"
            className="active:scale-[0.96]"
            onClick={() => openEdit(app)}
          >
            <PencilIcon aria-hidden />
            Edit
          </Button>
          <GroupSeparator />
        </>
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="More actions"
              className="shrink-0"
            />
          }
        >
          <ChevronDownIcon className="size-4" aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          <ApplicationItemActions
            app={app}
            slots={slots}
            density={density}
            hidePrimaryKind={primary?.kind ?? null}
          />
        </MenuPopup>
      </Menu>
    </Group>
  );
}
```

**Important:** `ApplicationPrimaryActionButton` currently adds `mt-2.5 h-7 w-full` for `layout="card"`. When nested in Group, override so Group owns width/radius (joined corners). May need a small prop on the primary button like `grouped` to suppress `w-full mt-2.5` and use `flex-1` instead — prefer extending the primary button rather than fighting styles.

Suggested addition to `ApplicationPrimaryActionButton`:

```ts
/** When true, drop card full-width / margin so parent Group controls layout. */
grouped?: boolean;
```

When `grouped`, className becomes `h-7 min-w-0 flex-1` (board) without `mt-2.5 w-full`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/application-action-group.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/application-primary-action-button.tsx
git commit -m "feat(web): add ApplicationActionGroup for magic+chevron"
```

---

### Task 3: Wire board, list, side panel

**Files:**

- `board.tsx`, `list.tsx`, `application-info-panel.tsx`

- [ ] **Step 1: Board** — delete header MoreHorizontal Menu block; replace `<ApplicationPrimaryActionButton … layout="card" />` with `<ApplicationActionGroup app={app} variant="board" />`.

- [ ] **Step 2: List** — desktop action strip and mobile Group both use `<ApplicationActionGroup app={app} variant="with-edit" menuSlots="list" />` (remove duplicate Edit / ChevronDown local markup).

- [ ] **Step 3: Side panel** — in `actions`, replace `{onEdit ? <PanelEditButton … /> : null}` with:

```tsx
{
  !isDiscovery ? (
    <ApplicationActionGroup app={item} variant="with-edit" menuSlots="list" />
  ) : onEdit ? (
    <PanelEditButton onClick={onEdit} />
  ) : null;
}
```

(Discovery may keep simple Edit if needed.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/board.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx
git commit -m "feat(web): wire ApplicationActionGroup on board list panel"
```

---

### Task 4: Browser verification

- [ ] Board: no ⋮; `[Prepare|▾]` (or current magic); menu lacks Prepare when primary is Prepare; Edit still in board menu.
- [ ] List desktop + mobile: `[Magic|Edit|▾]`; menu lacks Edit and matching primary.
- [ ] Side panel header: same Group; standalone Edit icon gone for tracked.
- [ ] Context menu still works on board.
- [ ] Drag card still works (stopPropagation on Group).

---

## Done when

Spec variants wired; primary dedupe works; board ⋮ removed; implement on main.
