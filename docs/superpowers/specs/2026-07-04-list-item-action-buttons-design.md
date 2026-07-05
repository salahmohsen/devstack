# ListItemActionButtons Design

## Summary

A reusable `ListItemActionButtons` component for the dashboard experience and project pages. Replaces the inline Edit+Delete buttons with a combined Group (split button) pattern — main Edit icon button + dropdown menu with Toggle Portfolio (Switch) and Delete.

## File

`apps/web/src/shared/ui/list-item-action-buttons.tsx`

## Props

```tsx
type ActionButtonConfig = {
  onAction: () => void;
  isLoading?: boolean;
};

type TogglePortfolioConfig = {
  onAction: () => void;
  isLoading?: boolean;
  isInPortfolio: boolean;
};

type ListItemActionButtonsProps = {
  edit?: ActionButtonConfig;
  togglePortfolio?: TogglePortfolioConfig;
  delete?: ActionButtonConfig;
};
```

All props are optional. When a prop is omitted, the corresponding control is not rendered.

## Loading Behavior

When `isLoading` is `true` on any config:

- **Edit button**: the `Button` receives `loading` prop which shows a spinner overlay (this is built into the coss `Button` component)
- **Toggle/Menu items**: the corresponding `MenuItem` receives `data-loading` state and is disabled; no spinner shown (menu items use `disabled` styling)
- **Menu trigger**: disabled when any action in the menu is loading

## Structure

```
<Group>
  <Button size="icon" onClick={edit.onAction}>
    <Edit />
  </Button>
  <GroupSeparator />
  <Menu>
    <MenuTrigger render={<Button size="icon" />}>
      <ChevronDown />
    </MenuTrigger>
    <MenuPopup align="end">
      <MenuItem onClick={togglePortfolio.onAction}>
        <span>In portfolio</span>
        <Switch checked={togglePortfolio.isInPortfolio} />
      </MenuItem>
      <MenuSeparator />
      <MenuItem variant="destructive" onClick={delete.onAction}>
        <Trash2 />
        Delete
      </MenuItem>
    </MenuPopup>
  </Menu>
</Group>
```

- Edit button: `size="icon"`, `Edit` icon, prefetches on hover (caller handles via `onMouseEnter`)
- Menu trigger: `size="icon"`, `ChevronDown` icon
- Toggle item: `MenuItem` row with label + `Switch`, clicking toggles controlled state
- Separator before delete
- Delete item: `variant="destructive"`, `Trash2` icon + "Delete" label

## Usage

### experience-item.tsx

```tsx
<ListItemActionButtons
  edit={{
    onAction: () => onEdit?.(experience.id),
    isLoading: false
  }}
  togglePortfolio={{
    onAction: handleTogglePortfolio,
    isInPortfolio: !!experience.portfolioEntryId,
    isLoading: toggleMutation.isPending
  }}
  delete={{
    onAction: handleDelete,
    isLoading: deleteMutation.isPending
  }}
/>
```

### project-item.tsx

Same pattern, using project-specific mutations.

## Integration

- Delete dialog remains in the item component — `handleDelete` opens the dialog
- Toggle mutation calls `orpcQueryClient.portfolio.toggle.mutationOptions()` with invalidation on success
- Both items import the component from `@/shared/ui/list-item-action-buttons`

## Non-Goals

- No deletion confirmation inside the component (stays in parent)
- No prefetch logic inside the component (caller may add `onMouseEnter` on the wrapper)
- No mutation/invalidation logic — component is purely presentational
