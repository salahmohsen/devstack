# GitHub Repo Page Port

## Status

This file is a current-state summary for the public GitHub repo experience in `portfolio-v2`.
It replaces the earlier task log that drifted after the layout and data work landed.

## What Exists Now

- Public repo routes live under `apps/web/src/routes/{-$locale}/(github-layout)/...`.
- The public GitHub shell lives under `apps/web/src/widgets/layout/`, not `widgets/github-public-layout` or `widgets/layouts`.
- `GithubRepoPage` renders the repo overview screen and still uses `SidePanelPortal` from `@/widgets/layout` for the activity cards side panel.
- Branch comparison is implemented as a read-only banner in `apps/web/src/pages/github-repo/ui/branch-comparison-banner.tsx`.
- Repo data flows through `packages/github` → `packages/api/src/routers/public/github/index.ts` → page-local query files in `apps/web/src/pages/github-repo/api`.

## Current Constraints

- The app is public-owner only. There is no `scope` prop or per-viewer GitHub installation flow.
- Internal navigation in the GitHub shell uses TanStack/i18n `Link to` patterns where possible.
- Branch switching inside `GithubRepoPage` still uses `window.location.assign(...)` in `handleBranchChange`; do not document that flow as `useNavigate`-based.
- External compare links in `BranchComparisonBanner` intentionally go to GitHub.com because the app does not expose an internal compare page.
- Tailwind surface utilities such as `bg-surface-1` and `hover:bg-surface-2` currently depend on the `tailwindcss/no-unknown-classes` allowlist in [vite.config.ts](/Users/salah/Developer/portfolio-v2/vite.config.ts).

## Important Files

- `apps/web/src/pages/github-repo/ui/github-repo-page.tsx` — public repo overview page
- `apps/web/src/pages/github-repo/ui/repo-explorer-layout.tsx` — tree/blob explorer shell
- `apps/web/src/pages/github-repo/ui/branch-comparison-banner.tsx` — read-only ahead/behind banner
- `apps/web/src/pages/github-repo/api/` — slice-local React Query wrappers
- `apps/web/src/widgets/layout/ui/github-public-topbar.tsx` — topbar nav and shortcuts
- `apps/web/src/widgets/layout/ui/github-public-mobile-nav.tsx` — mobile nav
- `packages/github/src/repo/repo-branch-comparison/get-repo-branch-comparison.ts` — branch compare reader
- `packages/api/src/routers/public/github/index.ts` — public GitHub procedures

## Known Gaps

- There is still no in-app compare view; compare links remain external.
- This summary does not promise zero repo-wide lint errors. It only describes the current public GitHub repo implementation paths.
