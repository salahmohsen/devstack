# DiffKit GitHub Layout And Components Implementation Plan

> Historical planning artifact from 2026-06-07. Treat the current implementation under `apps/web/src/widgets/layout`, `apps/web/src/pages/github-profile`, `apps/web/src/pages/github-repo`, and `packages/github` as the source of truth when this plan disagrees with the repo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current simplified public GitHub profile/repository UI with DiffKit's profile, repository list, repository explorer, and file-view layouts adapted to `portfolio-v2`.

**Architecture:** Treat `/Users/salah/Developer/diffkit` as the source implementation and extract behavior/component structure, not just visual styling. Keep GitHub network/cache logic in `@tsu-stack/github`, expose missing reads through `packages/api`, consume them through slice-local query modules in `apps/web`, and render DiffKit-style UI in app-local page/feature components. Public GitHub routes should use a dedicated GitHub layout so `/`, `/$owner`, and `/$owner/$repo` visually match DiffKit without inheriting the existing marketing navbar/footer.

**Tech Stack:** TanStack Start file routes, TanStack Query, oRPC, Hono, Cloudflare Workers, Drizzle/Postgres cache, Octokit, `@tsu-stack/ui`, Tailwind CSS, Lucide icons, `motion`.

---

## Source Reference

Use these DiffKit files as the source of truth:

- App shell, tabs, and account menu:
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-layout.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-topbar.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-tabs.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-mobile-nav.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/tab-store.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/use-register-tab.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/shortcuts.ts`
- Profile route and layout: `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/index.tsx`
- Profile components:
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/profile/contribution-graph.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/profile/pinned-repo-card.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/profile/user-activity-feed.tsx`
- Repo route and layout:
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/$repo/index.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-overview-page.tsx`
- Repo components:
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-header.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repository-row.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/code-explorer-toolbar.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/file-tree.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/latest-commit-bar.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-markdown-files.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-sidebar.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-activity-cards.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-commit-sparkline.tsx`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-overview-skeleton.tsx`
- Supporting logic:
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.query.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.functions.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.types.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/format-relative-time.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/repo-list-page.ts`
  - `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/repo-clone-protocol-storage.ts`

Do not port DiffKit's auth/session/user-installation assumptions. `portfolio-v2` remains a single configured-owner public portfolio backed by dashboard-owned GitHub settings.

## Current Target State

The first-pass implementation already has:

- `packages/github` with public profile, contributions, pinned repos, activity, repo overview, repo tree, and file content reads.
- `packages/api/src/routers/public/github/index.ts` with public oRPC procedures for the existing reads.
- `apps/web/src/pages/github-profile` with simplified profile UI and query modules.
- `apps/web/src/pages/github-repo` with simplified repo UI and query modules.
- `apps/web/src/features/github-live` with public WebSocket invalidation subscriptions.
- Public routes currently under `apps/web/src/routes/{-$locale}/(root-layout)/...`.

This plan upgrades that first pass to DiffKit parity.

## TanStack Start Guidance Applied

This plan uses `tanstack-start-best-practices` for the route/layout work:

- Keep route files thin. Routes create file routes, preload data, redirect/not-found, and render page/layout components only.
- Keep server-only GitHub/cache logic out of browser-imported modules. Browser code may import client-safe constants/types only.
- Avoid hydration mismatches in the DiffKit shell. Client-only state such as local-storage-backed tabs, window sizing, clipboard state, and media queries must initialize after mount or through hydration-safe hooks.
- Prefer route loaders/`beforeLoad` plus TanStack Query `ensureQueryData(...)` for SSR-friendly data availability.
- Use redirects/not-found from route `beforeLoad` for owner mismatch and missing setup states, not component-time navigation.

## Non-Goals

- Do not add arbitrary multi-user browsing. `/$owner` remains an alias for the configured owner only.
- Do not port DiffKit private viewer/install-token flows.
- Do not port write actions such as star/fork mutation unless they already have a public-safe no-op/disabled state.
- Do not port DiffKit's Inbox, Pull Requests, Issues, or Reviews primary nav pages into the public GitHub shell.
- Do not move GitHub API logic into `apps/web`.
- Do not import the `@tsu-stack/github` package root from browser code; use client-safe subpath exports for shared constants.

## File Structure

### Create

- `apps/web/src/widgets/github-public-layout/index.ts`
- `apps/web/src/widgets/github-public-layout/ui/github-public-layout.tsx`
- `apps/web/src/widgets/github-public-layout/ui/github-public-topbar.tsx`
- `apps/web/src/widgets/github-public-layout/ui/github-public-tabs.tsx`
- `apps/web/src/widgets/github-public-layout/ui/github-public-mobile-nav.tsx`
- `apps/web/src/widgets/github-public-layout/lib/github-public-tab-store.ts`
- `apps/web/src/widgets/github-public-layout/lib/use-register-github-public-tab.ts`
- `apps/web/src/widgets/github-public-layout/lib/use-global-shortcuts.ts`
- `apps/web/src/pages/github-profile/lib/profile-tabs.ts`
- `apps/web/src/pages/github-profile/lib/repo-list-page.ts`
- `apps/web/src/pages/github-profile/lib/format-github-count.ts`
- `apps/web/src/pages/github-profile/ui/contribution-graph.tsx`
- `apps/web/src/pages/github-profile/ui/pinned-repo-card.tsx`
- `apps/web/src/pages/github-profile/ui/user-activity-feed.tsx`
- `apps/web/src/pages/github-profile/ui/repository-row.tsx`
- `apps/web/src/pages/github-repo/lib/format-relative-time.ts`
- `apps/web/src/pages/github-repo/lib/repo-clone-protocol-storage.ts`
- `apps/web/src/pages/github-repo/ui/repo-header.tsx`
- `apps/web/src/pages/github-repo/ui/repo-star-fork-actions.tsx`
- `apps/web/src/pages/github-repo/ui/code-explorer-toolbar.tsx`
- `apps/web/src/pages/github-repo/ui/latest-commit-bar.tsx`
- `apps/web/src/pages/github-repo/ui/file-tree.tsx`
- `apps/web/src/pages/github-repo/ui/repo-markdown-files.tsx`
- `apps/web/src/pages/github-repo/ui/repo-sidebar.tsx`
- `apps/web/src/pages/github-repo/ui/repo-activity-cards.tsx`
- `apps/web/src/pages/github-repo/ui/repo-commit-sparkline.tsx`
- `apps/web/src/pages/github-repo/ui/repo-overview-skeleton.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/route.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/index.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/$owner/index.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/index.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/tree/$.tsx`
- `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/blob/$.tsx`
- `packages/github/src/repo/get-repo-branches.ts`
- `packages/github/src/repo/get-tree-entry-commits.ts`
- `packages/github/src/repo/get-repo-commit-sparkline.ts`
- `packages/github/src/repo/get-repo-activity-cards.ts`

### Modify

- `apps/web/package.json`
- `packages/ui/package.json`
- `packages/ui/components/badge.tsx`
- `packages/ui/components/tabs.tsx`
- `packages/ui/components/popover.tsx`
- `packages/ui/components/command.tsx`
- `packages/ui/components/context-menu.tsx`
- `packages/github/src/index.ts`
- `packages/github/package.json`
- `packages/github/src/types.ts`
- `packages/github/src/cache/github-cache-policy.ts`
- `packages/api/src/routers/public/github/index.ts`
- `apps/web/src/pages/github-profile/api/*.query.ts`
- `apps/web/src/pages/github-profile/ui/github-profile-page.tsx`
- `apps/web/src/pages/github-profile/index.ts`
- `apps/web/src/pages/github-repo/api/*.query.ts`
- `apps/web/src/pages/github-repo/ui/github-repo-page.tsx`
- `apps/web/src/pages/github-repo/index.ts`
- Delete or replace `apps/web/src/routes/{-$locale}/(root-layout)/index.tsx`
- Delete or replace `apps/web/src/routes/{-$locale}/(root-layout)/$owner/index.tsx`
- Delete or replace `apps/web/src/routes/{-$locale}/(root-layout)/$owner/$repo/index.tsx`

---

### Task 1: Add Missing UI Primitives And Dependencies

**Files:**

- Create/Modify: `packages/ui/components/badge.tsx`
- Create/Modify: `packages/ui/components/tabs.tsx`
- Create/Modify: `packages/ui/components/popover.tsx`
- Create/Modify: `packages/ui/components/command.tsx`
- Create/Modify: `packages/ui/components/context-menu.tsx`
- Modify: `packages/ui/package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] Check whether `badge`, `tabs`, `popover`, `command`, and `context-menu` already exist in `packages/ui/components`.
- [ ] Add missing shadcn-compatible primitives to `packages/ui/components`, following the repo's current `@base-ui/react`/Radix dependency style.
- [ ] Keep these primitives app-agnostic. They must not import from `apps/web`, TanStack Router, env modules, or GitHub code.
- [ ] Add `@number-flow/react` to `apps/web` only if the extracted `ContributionGraph` keeps the animated count tooltip.
- [ ] Do not add `@diffkit/icons`; map icons to existing `lucide-react` icons in the extracted components.
- [ ] Run `vp install --no-frozen-lockfile --ignore-scripts`.
- [ ] Run `vp check` in `packages/ui`.
- [ ] Commit after this task if implementing interactively:

```bash
git add packages/ui apps/web/package.json pnpm-lock.yaml
git commit -m "feat(ui): add primitives for github public pages"
```

### Task 2: Add Public GitHub Data Needed For DiffKit Repo UI

**Files:**

- Modify: `packages/github/src/types.ts`
- Create: `packages/github/src/repo/get-repo-branches.ts`
- Create: `packages/github/src/repo/get-tree-entry-commits.ts`
- Create: `packages/github/src/repo/get-repo-commit-sparkline.ts`
- Create: `packages/github/src/repo/get-repo-activity-cards.ts`
- Modify: `packages/github/src/repo/get-repo-overview.ts`
- Modify: `packages/github/src/profile/get-profile-repos.ts`
- Modify: `packages/github/src/cache/github-cache-policy.ts`
- Modify: `packages/github/src/index.ts`
- Modify: `packages/github/package.json`

- [ ] Compare `packages/github/src/types.ts` with DiffKit's `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.types.ts`.
- [ ] Extend `GitHubUserActivityEvent` so `UserActivityFeed` can render DiffKit-style grouped events:
  - `repo: { name: string; url: string }`
  - `commits?: Array<{ message: string; sha: string; url: string | null }>`
  - `prDetail?: { number: number; state: "open" | "closed" | "merged"; title: string; url: string }`
  - `issueDetail?: { number: number; state: "open" | "closed"; title: string; url: string }`
- [ ] Extend `GitHubUserRepoSummary` for DiffKit repository rows:
  - `id`
  - `fullName`
  - `visibility: "public" | "private" | "internal"`
  - `languageColor`
  - `updatedAt`
  - `pushedAt`
- [ ] Extend `GitHubRepoOverview` for DiffKit repo components:
  - `owner`
  - `fullName`
  - `branchCount`
  - `tagCount`
  - `isArchived`
  - `isDisabled`
  - `isTemplate`
  - `forkParentFullName`
  - `forkParentOwnerAvatarUrl`
  - `contributorsCount`
- [ ] Implement `getRepoBranches(input, runtime)` using GitHub GraphQL refs or REST branches.
- [ ] Implement `getTreeEntryCommits(input, runtime)` for root-level file rows. Return a map keyed by entry name with latest commit message/date/sha/url.
- [ ] Implement `getRepoCommitSparkline(input, runtime)` for repository list sparkline data. Prefer a small REST commits window; keep it cached and tolerate 404/empty results.
- [ ] Implement `getRepoActivityCards(input, runtime)` for side-panel counts/lists used by pull requests, issues, and actions cards. If GitHub Actions data is too expensive for this pass, return an empty actions list with a documented TODO in the plan implementation notes.
- [ ] Cache each new read through `getGitHubResourceLocalFirst`.
- [ ] Use `githubRevalidationSignalKeys.repoMeta(...)` and `repoCode(...)` consistently so webhook invalidation refreshes the new reads.
- [ ] Export new functions from `packages/github/src/index.ts`.
- [ ] Add client-safe subpath exports only for browser-safe constants/types. Do not expose server-only modules through a browser import path.
- [ ] Run `vp check` in `packages/github`.

### Task 3: Expose Missing Reads Through Public oRPC

**Files:**

- Modify: `packages/api/src/routers/public/github/index.ts`
- Modify: `packages/api/src/client/tanstack-start/orpc.ts` if generated/typed client output changes

- [ ] Add output schemas for:
  - repo branches
  - tree entry commits
  - repo commit sparkline
  - repo activity cards
- [ ] Add public procedures:
  - `public.github.getRepoBranches`
  - `public.github.getTreeEntryCommits`
  - `public.github.getRepoCommitSparkline`
  - `public.github.getRepoActivityCards`
- [ ] Keep every procedure explicit with `.route({ description, method })`, `.input(...)`, and `.output(...)`.
- [ ] Keep absent GitHub setup graceful. Missing configuration should return empty collections or `null`, not throw into public pages.
- [ ] Do not expose token/config details in any response.
- [ ] Run `vp check` in `packages/api`.

### Task 4: Add Slice-Local Query Modules For New Reads

**Files:**

- Create: `apps/web/src/pages/github-repo/api/get-github-repo-branches.query.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-tree-entry-commits.query.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-repo-commit-sparkline.query.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-repo-activity-cards.query.ts`
- Modify: `apps/web/src/pages/github-repo/index.ts`
- Modify: existing `apps/web/src/pages/github-profile/api/*.query.ts` only if output types changed

- [ ] Follow `.agents/api-fetching-patterns.md`.
- [ ] Keep one query file per operation.
- [ ] Export query keys, query option factories, hook wrappers, and useful result types.
- [ ] Use `orpc.public.github.*.queryOptions()` wrappers only.
- [ ] Keep query modules inside `pages/github-repo/api` and `pages/github-profile/api`; do not create a global GitHub query file in `apps/web`.
- [ ] Run `vp check` in `apps/web` after adding modules.

### Task 5: Remove Current Public GitHub Root Layout Wiring First

**Files:**

- Create: `apps/web/src/widgets/github-public-layout/index.ts`
- Create: `apps/web/src/widgets/github-public-layout/ui/github-public-layout.tsx`
- Create: `apps/web/src/routes/{-$locale}/(github-layout)/route.tsx`
- Move/Create: `apps/web/src/routes/{-$locale}/(github-layout)/index.tsx`
- Move/Create: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/index.tsx`
- Move/Create: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/index.tsx`
- Delete: `apps/web/src/routes/{-$locale}/(root-layout)/index.tsx`
- Delete: `apps/web/src/routes/{-$locale}/(root-layout)/$owner/index.tsx`
- Delete: `apps/web/src/routes/{-$locale}/(root-layout)/$owner/$repo/index.tsx`
- Modify: `apps/web/src/routeTree.gen.ts`

- [ ] Create a minimal `GithubPublicLayout` shell with `min-h-screen`, dark GitHub-style background, and `<Outlet />`.
- [ ] Create the `(github-layout)/route.tsx` file route that renders `GithubPublicLayout` and an outlet.
- [ ] Move the public GitHub route behavior for `/`, `/$owner`, and `/$owner/$repo` from `(root-layout)` to `(github-layout)`.
- [ ] Delete the old public GitHub route files under `(root-layout)` immediately after the replacement routes exist.
- [ ] Do not keep duplicate public routes in both layout groups. There should be exactly one route owner for `/`, `/$owner`, and `/$owner/$repo`.
- [ ] Keep `Playground`, `Dashboard`, API docs, and any non-GitHub marketing or utility pages in the existing `(root-layout)`.
- [ ] Keep route files thin: route metadata, `beforeLoad`, `ensureQueryData(...)`, redirects/not-found, and component wiring only.
- [ ] Use `beforeLoad` to redirect/reject mismatched `/$owner` values before rendering page components.
- [ ] Preserve the setup-status and configured-owner preloading behavior from the current first-pass routes while moving them.
- [ ] Let TanStack regenerate `apps/web/src/routeTree.gen.ts`.
- [ ] Run `vp check` in `apps/web` before continuing to DiffKit UI extraction.
- [ ] This task is mandatory before implementing the topbar/profile/repo extraction. Do not layer the DiffKit shell inside `RootLayout`.

### Task 6: Extract DiffKit Topbar, Avatar Menu, And Persistent Tabs

**Files:**

- Create: `apps/web/src/widgets/github-public-layout/ui/github-public-topbar.tsx`
- Create: `apps/web/src/widgets/github-public-layout/ui/github-public-tabs.tsx`
- Create: `apps/web/src/widgets/github-public-layout/ui/github-public-mobile-nav.tsx`
- Create: `apps/web/src/widgets/github-public-layout/lib/github-public-tab-store.ts`
- Create: `apps/web/src/widgets/github-public-layout/lib/use-register-github-public-tab.ts`
- Create: `apps/web/src/widgets/github-public-layout/lib/use-global-shortcuts.ts`
- Modify: `apps/web/src/widgets/github-public-layout/index.ts`
- Modify: `apps/web/src/widgets/github-public-layout/ui/github-public-layout.tsx`

- [ ] Extract the topbar structure from `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-topbar.tsx`.
- [ ] Extract the persistent closeable tab behavior from `/Users/salah/Developer/diffkit/apps/dashboard/src/components/layouts/dashboard-tabs.tsx`.
- [ ] Extract the tab store from `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/tab-store.ts`, but rename the storage key to an app-specific value such as `portfolio-v2:github-public-tabs`.
- [ ] Reduce tab types to the public GitHub shell:
  - `repo`
  - `commit`
  - `actions` only if actions pages/cards are implemented
- [ ] Remove `pull`, `issue`, and `review` tab behavior from the adapted store and UI.
- [ ] Keep the primary nav pill row, but only show `Overview`.
- [ ] Remove the DiffKit primary nav items for `Inbox`, `Pull Requests`, `Issues`, and `Reviews`.
- [ ] Make the `Overview` pill link to the canonical public profile route `/`.
- [ ] Keep the dynamic detail-tab strip to the right of `Overview`, with close, close others, close tabs to the right, drag reorder, horizontal wheel scrolling, scroll shadows, and active-tab scrolling.
- [ ] Add a far-right control cluster in the topbar after the dynamic tab strip.
- [ ] Put `LocaleSwitcher` from `apps/web/src/shared/ui/locale-switcher.tsx` in that far-right cluster.
- [ ] Put `ThemeSwitcher` from `apps/web/src/shared/ui/theme-switcher.tsx` in that far-right cluster.
- [ ] Keep the far-right controls visible on desktop even when many dynamic tabs are open; tabs should shrink/scroll before the language/theme controls are pushed off screen.
- [ ] On mobile, include language and theme controls in the reduced avatar menu or mobile nav action area so they remain reachable without crowding the bottom nav.
- [ ] Remove the "Close merged" context menu item because pull/review tabs are not part of this app shell.
- [ ] Keep Shift+number tab switching, Shift+W close-current-tab, Shift+ArrowLeft/Right previous/next tab shortcuts if they do not conflict with existing app shortcuts.
- [ ] Add a small avatar dropdown at the left of the topbar using this app's current auth primitives:
  - `useAuth` or `useAuthSuspense` from `@tsu-stack/auth/react/tanstack-start/hooks`
  - `authClient.signOut(...)`
  - `getAuthUserQueryOptions()` invalidation
- [ ] The avatar menu should show the signed-in user's avatar/name/email when authenticated.
- [ ] When unauthenticated, render a minimal sign-in action or disabled avatar state matching the DiffKit shape.
- [ ] Avatar menu entries:
  - `Profile` -> configured owner profile route (`/` or `/$owner` when owner is known)
  - `Repositories` -> configured owner repositories tab (`/?tab=repositories`)
  - `Dashboard` -> `/dashboard`
  - `Sign out` -> existing Better Auth sign-out flow
- [ ] Replace DiffKit's `Settings` menu entry with `Dashboard`.
- [ ] Preserve DiffKit's menu shortcuts visually where useful:
  - Profile: `G then U`
  - Repositories: `G then O`
  - Dashboard: `G then D`
- [ ] Add global shortcut handlers for those three navigation actions only if the implementation already has enough context to resolve configured owner safely.
- [ ] Replace `@diffkit/icons` with Lucide icons:
  - Overview: `House`
  - Profile: `CircleUser`
  - Repositories: `Archive`
  - Dashboard: `LayoutDashboard`
  - Sign out: `LogOut`
  - Repo tabs: `Archive`
  - Commit tabs: `GitCommit`
  - Close/context actions: `X`, `PanelRightClose`, `ChevronRight`
- [ ] Do not port DiffKit's "More actions" menu unless the user explicitly asks for those product links.
- [ ] Adapt the mobile nav from `dashboard-mobile-nav.tsx` to the same reduced nav surface: Overview, Repositories, and Avatar menu.
- [ ] Run `vp check` in `apps/web`.

### Task 7: Extract DiffKit Profile UI

**Files:**

- Create: `apps/web/src/pages/github-profile/lib/profile-tabs.ts`
- Create: `apps/web/src/pages/github-profile/lib/repo-list-page.ts`
- Create: `apps/web/src/pages/github-profile/lib/format-github-count.ts`
- Create: `apps/web/src/pages/github-profile/ui/contribution-graph.tsx`
- Create: `apps/web/src/pages/github-profile/ui/pinned-repo-card.tsx`
- Create: `apps/web/src/pages/github-profile/ui/user-activity-feed.tsx`
- Create: `apps/web/src/pages/github-profile/ui/repository-row.tsx`
- Modify: `apps/web/src/pages/github-profile/ui/github-profile-page.tsx`
- Modify: `apps/web/src/pages/github-profile/index.ts`

- [ ] Copy DiffKit's visual structure from `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/index.tsx`.
- [ ] Adapt `ContributionGraph` from DiffKit to `@tsu-stack/ui/lib/utils`, `motion/react`, and the current `GitHubContributionCalendar` shape.
- [ ] Replace `@diffkit/icons` with Lucide icons:
  - building/company: `Building2`
  - location: `MapPin`
  - external link/blog/twitter: `ExternalLink`
  - followers: `Users`
  - edit profile: `Pencil`
  - star/fork/commit/PR/issue/activity: closest Lucide GitHub-style equivalents
- [ ] Use `@tsu-stack/i18n/tanstack-start/components/link` or route-aware links already used by this app instead of DiffKit's raw `@tanstack/react-router` `Link` where locale preservation matters.
- [ ] Implement tabs using URL search:
  - default overview state at `/`
  - repositories state with `?tab=repositories`
  - repo pagination with `?page=N`
- [ ] Keep `/` canonical for the configured owner. `/$owner` should render the same UI only when it matches configured owner.
- [ ] Render the contribution graph as the top banner with edge fades and overlapping avatar, matching the screenshots.
- [ ] Render the profile header with name, login, joined date, bio, metadata row, followers/following, and compact tabs.
- [ ] Render overview tab with pinned cards and grouped recent activity.
- [ ] Render repositories tab with DiffKit-style repository rows and lazy sparklines.
- [ ] Keep setup/missing-config state visually intentional but secondary; it should not look like the old marketing page.
- [ ] Keep live WebSocket subscriptions for profile, pinned repos, contributions, activity, and repo list.
- [ ] Run `vp check` in `apps/web`.

### Task 8: Extract DiffKit Repo Explorer UI

**Files:**

- Create: `apps/web/src/pages/github-repo/lib/format-relative-time.ts`
- Create: `apps/web/src/pages/github-repo/lib/repo-clone-protocol-storage.ts`
- Create: `apps/web/src/pages/github-repo/ui/repo-header.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-star-fork-actions.tsx`
- Create: `apps/web/src/pages/github-repo/ui/code-explorer-toolbar.tsx`
- Create: `apps/web/src/pages/github-repo/ui/latest-commit-bar.tsx`
- Create: `apps/web/src/pages/github-repo/ui/file-tree.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-markdown-files.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-sidebar.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-activity-cards.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-commit-sparkline.tsx`
- Create: `apps/web/src/pages/github-repo/ui/repo-overview-skeleton.tsx`
- Modify: `apps/web/src/pages/github-repo/ui/github-repo-page.tsx`
- Modify: `apps/web/src/pages/github-repo/index.ts`

- [ ] Copy DiffKit's repo overview composition from `repo-overview-page.tsx`, then adapt imports and data types.
- [ ] Register opened repo pages with `useRegisterGithubPublicTab` so visiting `/$owner/$repo` creates or updates a persistent `repo` tab with title `<owner>/<repo>`, URL, owner avatar, and repo id.
- [ ] Register blob/commit/file views with the same tab system where routes exist.
- [ ] Render the repo header with owner avatar, owner/repo breadcrumb, visibility badge, fork parent line, and star/fork display.
- [ ] Implement `RepoStarForkActions` as read-only for now unless write procedures exist. Buttons may link to GitHub or show current counts, but must not pretend to mutate app state.
- [ ] Implement branch selector using the new `getRepoBranches` query and a `Popover`/`Command` primitive.
- [ ] Implement the Code popover with HTTPS, SSH, and GitHub CLI clone strings plus copy-to-clipboard.
- [ ] Implement latest commit bar using `repo.latestCommit`.
- [ ] Implement root `FileTree` with latest commit message/date per entry.
- [ ] Implement markdown file sections for README, CONTRIBUTING, LICENSE, SECURITY, CHANGELOG, and similar known files.
- [ ] Implement `RepoSidebar` with stats, details, topics, and contributors.
- [ ] Implement `RepoActivityCards` as a right side panel on desktop and an inline stacked section on mobile if the current app has no `SidePanelPortal` equivalent.
- [ ] Keep live WebSocket subscriptions for repo overview, tree, file content, tree-entry commits, branch data, and activity cards.
- [ ] Run `vp check` in `apps/web`.

### Task 9: Add Branch, Tree, Blob, And Route Layout Wiring

**Files:**

- Modify: `apps/web/src/widgets/github-public-layout/index.ts`
- Modify: `apps/web/src/widgets/github-public-layout/ui/github-public-layout.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(github-layout)/route.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(github-layout)/index.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/index.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/index.tsx`
- Create: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/tree/$.tsx`
- Create: `apps/web/src/routes/{-$locale}/(github-layout)/$owner/$repo/blob/$.tsx`

- [ ] Expand the already-created `GithubPublicLayout` so it matches DiffKit's full-page dark GitHub explorer feel:
  - DiffKit-style topbar with avatar menu, `Overview`, dynamic tabs, and far-right language/theme controls
  - no marketing footer
  - no sticky marketing navbar
  - `min-h-screen`
  - stable dark background
  - scrollbars and overflow behavior matching the screenshots
- [ ] In the `/` route, preload setup status, profile, pinned repos, contributions, and activity.
- [ ] In `/$owner`, reject or redirect owners that do not match configured owner.
- [ ] In `/$owner/$repo`, preload setup status, overview, tree, branches, and markdown files when cached overview/tree data is available.
- [ ] Add `/$owner/$repo/tree/$` for branch/path browsing.
- [ ] Add `/$owner/$repo/blob/$` for file content browsing.
- [ ] Keep route files thin. Route files should preload and pass params; page components own UI.
- [ ] Let TanStack regenerate `apps/web/src/routeTree.gen.ts`.
- [ ] Run `vp check` in `apps/web`.

### Task 10: Visual Parity And Responsive Polish

**Files:**

- Modify: profile/repo components created in Tasks 6-9
- Modify: `packages/ui/styles/base-theme.css` or app-level CSS only if needed for DiffKit's `surface-1`/`surface-2` equivalents

- [ ] Map DiffKit's `bg-surface-1` and `bg-surface-2` classes to existing app tokens or introduce app-local utility classes. Prefer app-local classes if these colors are only for the GitHub public pages.
- [ ] Match the profile screenshots:
  - topbar appears at the top with avatar menu, `Overview` active, and language/theme controls pinned to the far right
  - contribution graph banner occupies the first viewport top area
  - avatar overlaps banner
  - content width stays around DiffKit's `max-w-3xl`
  - overview/repositories tabs align to the right of the profile header on desktop
  - repositories list expands to a wider container on repositories tab
- [ ] Match the repo screenshots:
  - topbar remains visible above repo explorer with dynamic repo/file tabs and far-right language/theme controls
  - repository explorer uses a wide max-width grid
  - file table has compact rows, commit messages, and timestamps
  - sidebar cards sit to the right on desktop
  - branch/code controls sit above the file tree
  - file/blob view has left tree sidebar and central code/markdown panel
- [ ] Verify mobile layout:
  - tabs do not overflow
  - repo rows stack cleanly
  - file tree columns collapse without unreadable overlap
  - side panels become inline sections or sheets
- [ ] Avoid one-off color drift from the screenshots. Keep the page dark, neutral, and GitHub-like with green contribution highlights.

### Task 11: Browser And Runtime Verification

**Files:**

- No planned source edits unless verification finds issues.

- [ ] Run `vp check` in `packages/github`.
- [ ] Run `vp check` in `packages/api`.
- [ ] Run `vp check` in `apps/web`.
- [ ] Run `vp run -w fix` after package-local checks are green.
- [ ] Start dev servers with the repo's normal command:

```bash
vp run dev
```

- [ ] Open `/` and verify it matches the DiffKit overview screenshot.
- [ ] Open `/?tab=repositories` and verify it matches the DiffKit repositories screenshot.
- [ ] Open `/$owner/$repo` for a configured-owner repository and verify it matches the DiffKit repo explorer screenshot.
- [ ] Open `/$owner/$repo/blob/<branch>/<path>` for a text file and verify it matches the DiffKit file viewer screenshot.
- [ ] Verify the topbar has only `Overview` as a primary nav item and does not show `Inbox`, `Pull Requests`, `Issues`, or `Reviews`.
- [ ] Verify the language trigger and dark-mode trigger appear at the far right of the desktop topbar.
- [ ] Verify overflowing dynamic tabs scroll without hiding the far-right language/theme controls.
- [ ] Verify the avatar dropdown shows `Profile`, `Repositories`, `Dashboard`, and `Sign out`, and no `Settings` item.
- [ ] Verify repo/file route visits create persistent tabs, active tabs scroll into view, tabs can be closed, and reload restores tabs from local storage.
- [ ] Verify the reduced mobile nav keeps the avatar menu, language/theme controls remain reachable, and removed DiffKit nav items do not appear.
- [ ] Verify the browser console does not show `node:process` externalization errors. If it does, find which browser import touches `@tsu-stack/github` root or another server-only module.
- [ ] Verify public pages still render a setup state when GitHub settings are missing.
- [ ] Verify `/$owner` redirects or rejects mismatched owners.
- [ ] Verify live WebSocket invalidation still connects to `/server/api/ws/github-signals`.

## Implementation Notes

- The current simplified pages are placeholders. Replace them rather than layering DiffKit UI inside the old card-based layout.
- Keep all GitHub reads in `packages/github`; the web app should only call oRPC query wrappers.
- Browser code may import `@tsu-stack/github/cache/github-revalidation`, but must not import `@tsu-stack/github` root because the root exports server-only code.
- DiffKit's persistent tab registry should be ported for public repo/file tabs. DiffKit's `SidePanelPortal`, current user viewer checks, and private installation behavior should be pruned unless a public-safe equivalent exists.
- Use route search state directly through TanStack Router if possible. If adding `nuqs`, justify it in the implementation notes and add it deliberately to `apps/web/package.json`.
- Use Lucide icon replacements consistently. Do not vendor or install `@diffkit/icons`.
- Keep the route and query architecture aligned with `.agents/tanstack-patterns.md` and `.agents/api-fetching-patterns.md`.

## Commit Strategy

Commit after each major phase when implementing:

1. `feat(ui): add github page primitives`
2. `feat(github): add repo explorer public reads`
3. `feat(api): expose github repo explorer reads`
4. `feat(web): move github pages to public layout`
5. `feat(web): extract diffkit github topbar`
6. `feat(web): extract diffkit profile page`
7. `feat(web): extract diffkit repo explorer`
8. `feat(web): add public github tree and blob routes`

Do not commit the earlier cache/schema migration cleanup together with this visual extraction unless the user explicitly asks for one combined commit.
