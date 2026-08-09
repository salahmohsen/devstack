# Public Profile / Repositories Topbar Tabs

**Date:** 2026-08-09  
**Status:** Design (grill + brainstorm)  
**Related:** [Public surface paths](./2026-08-09-project-open-repo-public-surface-design.md), `public-surface.ts`, `github-public-topbar.tsx`

## Problem

Public portfolio chrome needs a stable way to switch between **Profile** and **Repositories** without relying only on the account menu. Visitors on the product root (`/`) do not know which tenant to open. Authenticated users and anyone already on a tenant-scoped public surface do.

## Product decisions (locked)

| Topic       | Decision                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whose links | **Page tenant first.** Path `/{profileName}/…` or custom-domain Host → that tenant. Primary `/` + signed-in, no page tenant → **session** user. Guest on primary `/` → **no tabs**. |
| Placement   | Fixed cluster **left of** document explorer tabs: `Brand · Profile                                                                                                                  | Repos · [document tabs] · actions` |
| Look        | Icons always (`UserCircle`, `Archive`); short labels **md+** (“Profile”, “Repositories”); **&lt; md** icon-only + `aria-label` / tooltip                                            |
| Hide        | `/dashboard/*`, `/sign-in` (and guest-only auth); not on unscoped **guest** primary `/`                                                                                             |
| Active      | **Profile** = portfolio home only (`/` on custom domain or exact `/{profileName}`). **Repositories** = entire repos tree (`/repos`, `/repos/**`, `/{p}/repos`, `/{p}/repos/**`)     |
| Paths       | Always via **`public-surface`** (custom domain never emits `/{username}/…`)                                                                                                         |

## Goals

1. Two topbar tabs (Profile, Repositories) with icons for public portfolio navigation.
2. Visibility rules as above (no guesswork on community landing for guests).
3. Correct Host-aware URLs on path and custom domain.
4. Accessible, coss-aligned UI that does not fight the document-tabs strip.

## Non-goals

- Replacing account menu Profile/Repos (keep as secondary).
- Showing tabs on dashboard/settings as primary IA.
- Merging product nav into closeable document tabs.
- Building a full multi-tenant profile switcher.

## UI primitive (coss)

Prefer **coss `Tabs`** (`@tsu-stack/ui/components/tabs`) over ad-hoc buttons:

- **Root** controlled by active segment (`profile` | `repos`) derived from pathname (not route panels — panels stay empty; tabs act as **links**).
- **List** `variant="underline"` (or default if underline is too tall for navbar height).
- **Tab** pattern: icon + optional label (md+), matching particles _Tabs with icon before name_ / _icon only_ (p-tabs-6 / p-tabs-8 style).
- Each tab **renders as TanStack `Link`** (or `render={<Link />}`) so middle-click and a11y work; do **not** use Tabs only for local panel switching.

If Tabs-as-links fight Base UI focus/selection, fall back to two `Button variant="ghost"` with shared underline styles — still coss Button, not custom inventing.

**Do not** use the explorer `Tabs` component in `github-public-tabs.tsx` (document tabs) for product nav — different concern.

## Visibility algorithm

```ts
type ScopeNavTarget = {
  show: boolean;
  surface: PublicSurface | null; // for link building
  active: "profile" | "repos" | null;
};

// Pseudocode
function resolveScopeNav(input: {
  pathname: string;
  hostname: string | null;
  pathProfileName?: string | null; // from route params
  sessionProfileName?: string | null;
  isCustomDomainHost: boolean;
}): ScopeNavTarget {
  if (isDashboardOrAuth(pathname)) return hide;

  // Page tenant from path or custom-domain Host (loader/context may supply tenant slug)
  const pageTenant = pathProfileName
    ?? (isCustomDomainHost && isPublicSurfacePath(pathname) ? customDomainTenantFromContext : null);

  if (pageTenant) {
    return show(surfaceFromHost(pageTenant), activeFromPath(pathname));
  }

  // Primary community root: only signed-in → own surface
  if (pathname === "/" || pathname === "") {
    if (sessionProfileName) {
      return show(pathSurface(sessionProfileName), active: null /* neither unless later */);
    }
    return hide;
  }

  return hide;
}
```

Notes:

- Custom-domain tenant slug comes from existing resolve/loader data (same as portfolio Home), not from inventing a second source.
- On custom-domain `/`, **Profile** is active; on `/repos/**`, **Repositories** is active.
- On primary `/` while signed in, neither need be “active” (or Profile if we treat own home as landing — prefer **neither** on community landing to avoid implying the community page is the portfolio).

## Layout (topbar)

```
[ Brand ] [ Profile | Repos ] ………… [ document Tabs (flex-1) ] …… [ theme | search | avatar ]
```

- Scope nav: `shrink-0`, small gap, aligned to navbar height.
- Document tabs keep `min-w-0 flex-1 overflow-hidden`.
- Mobile: icon-only scope tabs; document tabs still scroll.

## Implementation sketch

1. **`resolve-public-scope-nav.ts`** (or next to `public-surface.ts`) — pure visibility + active + surface.
2. **`PublicScopeNav`** component — coss Tabs + Links; consumes resolver + `usePublicSurface` / route mode.
3. **Wire in `github-public-topbar.tsx`** left of document `Tabs`.
4. **Supply page tenant** on custom domain from existing portfolio resolve (route context or props already used for Home/Repos).
5. **Tests (unit):** visibility matrix (guest root, signed-in root, path profile, custom domain repos nested, dashboard hide).

## Verification

| Context                   | Tabs   | Links / active                                                         |
| ------------------------- | ------ | ---------------------------------------------------------------------- |
| Guest primary `/`         | Hidden | —                                                                      |
| Signed-in primary `/`     | Shown  | Own profile/repos (path or custom if Host is custom — rare on primary) |
| `/{p}` portfolio          | Shown  | Profile active; Repos → `/{p}/repos`                                   |
| `/{p}/repos/**`           | Shown  | Repos active                                                           |
| Custom domain `/`         | Shown  | Profile active; links `/` and `/repos`                                 |
| Custom domain `/repos/**` | Shown  | Repos active; no slug in path                                          |
| `/dashboard/*`            | Hidden | —                                                                      |

## Success criteria

- [ ] Tabs appear only under the locked visibility rules.
- [ ] Links use public-surface (no username segment on custom domain).
- [ ] Active states match Profile home vs full Repos tree.
- [ ] coss Tabs (or documented Button fallback) with responsive labels.
- [ ] Document explorer tabs remain independent and scrollable.
