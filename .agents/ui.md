# UI Guidelines

Use this when adding or refactoring UI in `apps/web` or reusable components in `packages/ui`.

This file is the source of truth for app UI composition, extraction decisions, and shared component boundaries. For route/file placement, follow [TanStack patterns](./tanstack-patterns.md).

## Visual craft (required)

Before any UI or design work — layout, styling, motion, icons, polish, redesign, empty states — load **better-ui** and **impeccable** and follow them. Do not skip because the change is small. Then use this file for composition and `packages/ui` boundaries.

## Goals

- Prefer existing primitives from `@tsu-stack/ui` before creating new app-local ones.
- Keep `packages/ui` reusable and app-agnostic.
- Keep route files thin and UI composition in pages, features, widgets, or `shared/ui`.
- Extract shared UI only when reuse and app-agnostic boundaries are real.

## Default Sources

- Prefer existing components from `@tsu-stack/ui/components/*` before creating new app-local primitives.
- Prefer app wrappers from `apps/web/src/shared/ui` when the app already owns routing, image, locale, or other app-specific integration details.
- Use `lucide-react` for icons unless an existing asset or brand graphic is the better fit.
- Use `@tsu-stack/ui/lib/utils` `cn(...)` for class composition.
- Keyboard shortcuts: [TanStack Hotkeys](./hotkeys.md). Do not write a custom `keydown` matcher.

## App Composition

- Build page UI in `pages/`, composite sections in `widgets/` and `features/`, and app-level primitives in `shared/ui`.
- Prefer composing `@tsu-stack/ui` primitives instead of duplicating styling across many leaf components.
- Keep route files thin. Put UI composition in page, feature, widget, or shared components, not in route files.

## Dashboard surface + island shell

For multi-pane dashboard sections (Settings, Career Inbox hub, Review), use the app-local shell in `apps/web/src/shared/ui/dashboard-shell.tsx` — not a one-off layout per feature.

| Piece                     | Role                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| **`SurfaceShell`**        | Main elevated `Card` surface for the section body                       |
| **`IslandCard`**          | Darker nested island (`bg-muted/…`) for nav, folders, or category lists |
| **`SurfaceIslandLayout`** | Composes island (first) + primary pane with staggered fade-in           |

Rules:

- Island sits **inside** the surface (darker step of the same family — not a random second gray).
- Prefer island nav over horizontal tabs for section switching when the list can grow (AI, Notifications, Mail rules).
- Reuse this shell for Mail hub cards and `/dashboard/review` — do not fork styles.
- Motion: minimal opacity/y fade only; respect `prefers-reduced-motion` (built into the shell).

## Dashboard entity forms

Create/edit for experiences, projects, stacks, and applications uses `EntityFormSheet` (`apps/web/src/pages/dashboard/_lib/entity-form-panel.tsx`):

- **Desktop (`xl+`):** same side-panel chrome as item inspect (`ItemInfoPanel` — header, scroll body, prev/next + timestamps).
- **Mobile:** inset right `Sheet` (`variant="inset"`), not a centered Dialog.
- **Save in the header.** Do not add a Cancel/Save footer. Close is Escape, the sheet X, or deselecting (dirty confirm still runs).
- PromptDialog / AlertDialog stay for short collect-a-value and destroy confirms.

## Small input dialogs

For a title + one (or few) fields + Cancel / Continue, use `PromptDialog` from `@tsu-stack/ui/components/prompt-dialog`.

- **Dialog**, not AlertDialog (AlertDialog is confirm/destroy only).
- Header **outside** the form; `Form className="contents"` wraps **panel + footer** (coss `p-dialog-1`).
- Footer actions via `DialogCancel` / `DialogAction` (already inside `PromptDialog`).
- Fields stay TanStack `form.AppField` in the caller. Pass `onSubmit={() => void form.handleSubmit()}`.
- Let the dialog focus the first field. Skip a field tooltip when the header description already explains the value.
- Size `sm` (`sm:max-w-sm`) for a single input; `md` for URL or slightly longer copy.

## Confirm dialogs

For yes/no destroy, discard, send, or regenerate confirms, use `ConfirmDialog` from `@tsu-stack/ui/components/confirm-dialog` (coss `AlertDialog`).

- Prefer `ConfirmDialog` over hand-rolled `AlertDialog` + header/footer boilerplate.
- `confirmVariant="destructive"` for delete/remove; default for discard/send when not destructive.
- `confirmLoading` + default `blockDismissWhileLoading` block Escape/outside dismiss while pending.
- Optional `children` for extra body rows (e.g. To / Subject). Optional `icon` for a leading mark.
- Caller owns `open` / close after success — `onConfirm` does not auto-close.
- **Never mount confirm state inside `Menu` / `ContextMenu` popups** — those unmount on item click and the dialog vanishes. Host at page/card level (see tracked-jobs `deleteConfirmAppId` / material preview).

## Extraction Rule

- Extract a component to `packages/ui` when it is reusable, app-agnostic, and the shared package can own its styling and accessibility.
- Keep a component app-local when it depends on route params, current locale, auth state, app SEO, app config, or other app-owned integrations.
- If reuse is still speculative, keep the component app-local first and extract after a second real use case.

## Shared Package Boundaries

- `packages/ui` must not import from `apps/*`, TanStack Router, or app env modules.
- Keep semantic HTML, styling, layout, and accessibility inside the shared component.
- Keep CDN, proxy, locale, router, and analytics behavior outside shared UI primitives.
- Provide sensible defaults so shared components still work without injected app-specific dependencies.
- Keep colocated shared UI state near the component family that owns it.

## Dependency Injection

When a shared component needs an app-specific primitive, inject it instead of importing it.

- Navigation: accept `linkComponent?: React.ElementType`, default to `"a"`.
- Media: accept `imageComponent?: React.ElementType`, default to the shared `packages/ui` image primitive or a semantic fallback.
- Future wrappers: apply the same pattern for things like video, avatar, markdown, or analytics-aware buttons.
- Keep injected component props optional and forward the smallest useful prop surface.
- When router links may need either router `to` or plain `href`, support both and let the injected link decide what to use.
- For configurable media, keep related props grouped in a nested object instead of scattering env-specific props across the component API.

## Decision Rule

- Use prop injection when only data or one-off config changes per usage.
- Use component injection when behavior or implementation changes per app.
- Prefer component injection when the same app-specific dependency would otherwise be repeated across many call sites.
- For shared UI state that coordinates sibling components inside `packages/ui`, prefer a small colocated Zustand store over prop drilling or React context only to shuttle simple open/close state.

Reference pattern:

```tsx
type CardProps = {
  linkComponent?: React.ElementType;
  imageComponent?: React.ElementType;
  href: string;
  image?: {
    src: string;
    alt?: string;
    siteBaseUrl?: string;
    imgProxyBaseUrl?: string;
  };
};
```

## Remove icon buttons (X)

Row-remove and clear-value controls that render an X use `variant="destructive"`. That variant already owns the glass red glow — do not restyle it at the call site.

Dialog, sheet, and drawer close controls stay `variant="ghost"`. Cancel / dismiss in a toolbar stays outline or ghost.

```tsx
<Button type="button" size="icon" variant="destructive" aria-label="Remove contact">
  <X aria-hidden="true" />
</Button>
```

## Dialog footer actions

Do not restyle confirm/cancel buttons in `AlertDialog` or `Dialog` footers. The primitives own glow and pending:

| Primitive                            | Idle chrome                         | Pending                  |
| ------------------------------------ | ----------------------------------- | ------------------------ |
| `AlertDialogAction` / `DialogAction` | `variant` (default, destructive, …) | `loading` → pending glow |
| `AlertDialogCancel` / `DialogCancel` | outline                             | —                        |

Call site only passes `variant` and `loading`. Keep the label stable — do not swap in “Deleting…” / “Removing…” text.

```tsx
<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
<AlertDialogAction variant="destructive" loading={pending} onClick={onConfirm}>
  Remove domain
</AlertDialogAction>
```

Do not use `AlertDialogClose render={<Button />}` or a raw `StatusSubmitButton` in a dialog footer. Those skip this chrome.

## shadcn Usage

- The repo uses shadcn with the `base-maia` style, `neutral` base color, CSS variables, and Lucide icons.
- Add reusable shadcn-derived components to `packages/ui` when they can stay app-agnostic.
- Keep a component in `apps/web` when it depends directly on app routing, auth, SEO, locale, or app config.
- Keep app-level wrappers and glue code in `apps/web/src/shared/ui`.

## Images And Links

- Prefer app-owned wrappers for images or routing-aware links when the app needs locale, router, or env-specific behavior.
- Shared components should accept injected link or image components instead of importing app wrappers directly.
- Keep base URL, CDN, and proxy decisions outside shared primitives.

## Listing empty states

Dashboard list/grid empty states must use the shared `ItemsEmpty` wrapper (`@/widgets/items-page`), which composes coss `Empty`:

```tsx
import { ItemsEmpty } from "@/widgets/items-page";

<ItemsEmpty
  icon={<SomeLucideIcon aria-hidden />}
  title="No items yet"
  description="Short guidance on what to do next."
  action={
    <Button type="button" onClick={onAdd}>
      <PlusIcon aria-hidden />
      Add item
    </Button>
  }
/>;
```

Rules:

- Always use `ItemsEmpty` for entity listings (experiences, projects, stacks, resumes, applications, and similar).
- Always pass an `action` (primary create/add, plus optional secondary like "Show all").
- Put actions only in `action` — never as raw siblings outside `EmptyContent`.
- Prefer a Lucide `icon` via `EmptyMedia variant="icon"`.
- Do not use plain `<p>` / custom empty copy for list/filter empty states.
- Filtered-empty (e.g. Open/Closed tabs) should still use `ItemsEmpty` with a recovery action.

## Do And Don't

- Do keep `packages/ui` reusable and free of app imports.
- Do keep styling and accessibility inside the shared component.
- Do extract app-specific wrappers into `apps/web/src/shared/ui`.
- Don't hardcode router, locale, analytics, or env behavior into `packages/ui`.
- Don't introduce React context or excessive prop drilling for simple shared UI state when a colocated store is enough.
- Don't expose app-specific implementation details unless reuse requires them.
- Don't invent ad-hoc empty UIs for listings — use `ItemsEmpty` + coss Empty.
