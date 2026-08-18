# Application action Group (magic + chevron)

**Date:** 2026-08-18  
**Status:** Approved for implementation  
**Branch:** `main` (implement on main; no worktree)

## Goals

- Board cards: replace separate full-width Prepare button + top-right ⋮ with a coss **Group** `[Magic | ▾]` (Image 2 style).
- List (desktop + mobile) and application **side panel**: Group `[Magic | Edit | ▾]` with Magic and Edit as **primary** (`default`) buttons.
- Overflow menu opens from the chevron; omit the menu item that duplicates the current magic primary action.
- Shared component so board / list / panel do not fork Group markup.

## Non-goals

- Changing right-click / context menu content (except the same primary-action hide rule if it shares `ApplicationItemActions`).
- Reworking `ApplyPackagePanelActions` inside the panel body this pass (Prepare again / Send copy can stay; header Group is the new chrome).
- New apply-package / AI workflows.
- Unit tests unless requested.

## Variants

| Surface           | Group shape            | Notes                                                            |
| ----------------- | ---------------------- | ---------------------------------------------------------------- |
| Board card        | `[Magic \| ▾]`         | Full width under card body. Remove `MoreHorizontal` header menu. |
| List row          | `[Magic \| Edit \| ▾]` | Desktop + mobile. Replaces current overflow / mobile Group.      |
| Side panel header | `[Magic \| Edit \| ▾]` | Replaces `PanelEditButton` in `actions`.                         |

**Magic** = `ApplicationPrimaryActionButton` / `getApplicationPrimaryAction` (Prepare, Add JD, Review, Send, Open listing).

**Empty magic:** if `getApplicationPrimaryAction` is null, still render Group as `[▾]` only when a menu is needed (board/list/panel always need overflow). Do not drop menu access.

**Edit:** `openEdit(app)` — primary button in `with-edit` variant only.

**Chevron:** `MenuTrigger` with outline icon button + `ChevronDownIcon`; popup hosts `ApplicationItemActions`.

## Menu dedupe

- Compute `primaryKind = getApplicationPrimaryAction(app)?.kind ?? null`.
- Pass into `ApplicationItemActions` as e.g. `hidePrimaryKind`.
- Hide only the single matching apply-package / listing menu entry that equals that primary (Prepare / Add JD / Review / Send / Open listing).
- When Edit is shown in the Group (`with-edit`), keep existing `density="list-overflow"` (or equivalent) so Edit is not repeated in the menu.
- Board chevron menu: use density that **includes** Edit (Edit is not on the board Group).

## Component

**`ApplicationActionGroup`** in tracked-jobs UI (e.g. `application-action-group.tsx`):

```ts
type ApplicationActionGroupProps = {
  app: ApplicationOutput;
  variant: "board" | "with-edit";
  className?: string;
};
```

- Composes `Group`, `GroupSeparator`, magic button, optional Edit, Menu + `ApplicationItemActions`.
- Stop propagation on pointer/click so card drag / row select do not fire.
- Press scale / tokens: match existing primary buttons (`active:scale-[0.96]`).

## Call sites

- `board.tsx`: remove header ⋮ Menu; render `ApplicationActionGroup variant="board"` instead of standalone `ApplicationPrimaryActionButton`.
- `list.tsx`: desktop + mobile action strips use `variant="with-edit"`.
- `application-info-panel.tsx`: header `actions` use `variant="with-edit"` instead of `PanelEditButton` alone (still pass `onEdit` / store `openEdit`).

## Out of scope / follow-ups

- Slimming panel “Apply package” section to avoid any remaining CTA overlap with header magic.
- Discovery / new-jobs panel variants.
