# GitHub Repo Page Port

## Goal

Port diffkit's repo-overview-page.tsx features into portfolio's github-repo-page.tsx, matching component structure, div hierarchy, and classes, while adapting logic to portfolio's stack and making PR features read-only (no POST/write).

## Constraints & Preferences

- Use exactly the same div structure and CSS classes from diffkit, adapted only where design tokens don't exist in portfolio.
- Sub-components must use portfolio's existing prop signatures, not diffkit's.
- No `scope` prop (portfolio is public-only).
- No `SidePanelPortal`, `RecentPushBanner` (don't exist in portfolio).
- `BranchComparisonBanner` must be read-only: show ahead/behind info but remove "Create pull request" button.
- Link components must use `to` + `params` pattern for internal routes, not `href` with string concatenation.
- Keyboard shortcuts must use `router.navigate({ to, params })` not `window.location.assign` (matching diffkit's pattern).
- All new files must pass typecheck with zero errors.

## Progress

### Done

- Replaced broken JSX return block (lines 217–294) in `github-repo-page.tsx` that referenced nonexistent `activeRef`, `repoData`, `scope`, and broken `BranchComparisonBanner`, `RecentPushBanner`, `SidePanelPortal` components.
- Removed dead code: `blobLines`, `isDefaultBranch`, `blobContentQuery` (unused variables).
- Created backend procedure `getRepoBranchComparison` in `packages/github/src/repo/get-repo-branch-comparison.ts` using `octokit.rest.repos.compareCommits`.
- Added `GitHubRepoBranchComparison` type to `packages/github/src/types.ts`.
- Exported new procedure from `packages/github/src/index.ts`.
- Registered `getRepoBranchComparison` procedure in `packages/api/src/routers/public/github/index.ts` with zod input/output schemas.
- Created query hook `useGetGithubRepoBranchComparisonQuery` at `apps/web/src/pages/github-repo/api/get-github-repo-branch-comparison.query.ts`.
- Rewrote `branch-comparison-banner.tsx` to be read-only: removed "Create pull request" button, links go to GitHub.com with `target="_blank"`, uses portfolio UI tokens (`border-white/8`, `bg-white/3`, `rounded-2xl`).
- Added `BranchComparisonBanner` back to `github-repo-page.tsx` after `CodeExplorerToolbar`, conditioned on `!isDefaultBranch`.
- Converted `<Link href={...}>` to `<Link to={...}>` in `github-public-mobile-nav.tsx` — Profile/Repos links use `to="/$owner"` with `params={{ owner }}`, Dashboard uses `to="/dashboard"`, Sign-in uses `to="/sign-in"`, all with `disabled={!owner}`.
- Converted `<Link href={...}>` to `<Link to={...}>` in `github-public-topbar.tsx` — same pattern as mobile nav.
- Replaced `window.location.assign(profileHref)` shortcuts in topbar with `useNavigate` (from `@tsu-stack/i18n/tanstack-start/hooks/use-navigate`) stored in a ref, matching diffkit's `routerRef.current.navigate` pattern.
- Removed `getLocale` import and all locale-prefix string concatenation from topbar.
- Verified zero type/lint errors from all changed files (pre-existing errors remain in unrelated files).
- **Resolved `bg-surface-1` / `hover:bg-surface-2` lint errors** by adding an `allowlist` to `vite.config.ts`'s `tailwindcss/no-unknown-classes` rule config. The linter's `@tailwindcss/node` parser doesn't resolve `var()` references inside `@theme inline` blocks, so tokens like `--color-surface-1: var(--surface-1)` are not recognized as valid utility classes. Adding individual `--color-surface-1: initial` to the first `@theme` block (matching how `--color-card: initial` is declared) did NOT fix it — confirming the var-reference issue.

### In Progress

- (none)

### Blocked

- `RecentPushBanner` — does not exist in portfolio and has no backend API; requires a new procedure + UI component. Skipped for now.
- `SidePanelPortal` — not available in portfolio; `RepoActivityCards` rendered directly without portal wrapper.

## Key Decisions

- Use `overview.nameWithOwner` for `CodeExplorerToolbar`'s `fullName` prop (clone URL format `owner/repo`).
- `BranchComparisonBanner` compare links go to `https://github.com/...` (external) instead of app-internal routes — portfolio has no compare view.
- Signal stream subscribes to `repoMeta` and `repoCode` keys matching portfolio's existing `githubRevalidationSignalKeys` pattern.
- `parseRepoRouteSplat` resolves `routeSplat` into `branchName` and `routePath` correctly for code explorer/file tree.
- `FileTreeSkeleton` is inline (like diffkit) using portfolio tokens (`border-white/8`, `bg-white/4`) instead of `bg-surface-1`.
- Use `useNavigate` (i18n wrapper with locale prefix handling) + `useRef` for keyboard shortcut navigation instead of `window.location.assign` — matches diffkit's `routerRef.current.navigate` pattern.
- `--color-surface-*` theme tokens placed in `packages/ui/styles/base-theme.css` with explicit declarations in first `@theme` block AND `@theme inline` block — Tailwind v4 generates the utilities correctly, but `oxlint-tailwindcss`'s `@tailwindcss/node` parser cannot resolve `var()` references in `@theme inline` entries, requiring an `allowlist` workaround.
- `bg-surface-1`/`bg-surface-2` lint errors resolved via `allowlist` in `vite.config.ts` rule config (not CSS changes).

## Next Steps

- Verify no other `<Link href>` for internal routes exists across the codebase.

## Critical Context

- `Link` component from `@tsu-stack/i18n/tanstack-start/components/link` supports `to` + `params` for internal routes and `href` for external URLs — `href` renders as `<a target="_blank">`.
- `useNavigate` from `@tsu-stack/i18n/tanstack-start/hooks/use-navigate` wraps TanStack's navigate with automatic locale prefix handling.
- `repo-activity-cards.tsx` uses `href` with full GitHub URLs (external) — this is correct, no change needed.
- Portfolio's route structure uses `{-$locale}` prefix; `Link to` paths like `/$owner` and `router.navigate({ to: "/$owner" })` both work without locale prefix (handled by the i18n wrapper).
- `oxlint-tailwindcss` v1.2.0 uses `@tailwindcss/node` to load the design system — `var()` references in `@theme inline` blocks are not resolved, causing legitimate tokens like `bg-surface-1` to be flagged as unknown. Workaround: add classes to `allowlist` in the rule config.
- Pre-existing errors (9 errors, 5 warnings) remain in unrelated files (refs, `font-display`, `toaster`, `asChild`, FSD violations, TS type mismatches).

## Relevant Files

- `apps/web/src/pages/github-repo/ui/github-repo-page.tsx` — main page component, now matches diffkit structure with portfolio logic
- `apps/web/src/pages/github-repo/ui/branch-comparison-banner.tsx` — rewritten read-only banner
- `apps/web/src/pages/github-repo/api/get-github-repo-branch-comparison.query.ts` — new query hook
- `packages/github/src/repo/get-repo-branch-comparison.ts` — new backend procedure
- `packages/github/src/types.ts` — added `GitHubRepoBranchComparison`
- `packages/github/src/index.ts` — added export
- `packages/api/src/routers/public/github/index.ts` — added procedure + schemas
- `apps/web/src/widgets/github-public-layout/ui/github-public-mobile-nav.tsx` — converted Link `href` → `to`/`params` for Profile, Repos, Dashboard, Sign-in
- `apps/web/src/widgets/github-public-layout/ui/github-public-topbar.tsx` — converted Link `href` → `to`/`params` + shortcuts use `useNavigate`+`useRef` instead of `window.location.assign`
- `packages/ui/styles/base-theme.css` — added `--color-surface-*: initial` and explicit `--color-surface-[0-2]: initial` to first `@theme`, `--color-surface-[0-2]: var(--surface-[0-2])` to `@theme inline`
- `apps/web/src/widgets/github-public-layout/ui/dashboard-side-panel.tsx` — uses `bg-surface-1`/`hover:bg-surface-2`
- `apps/web/src/pages/github-repo/ui/latest-commit-bar.tsx` — uses `bg-surface-1`
- `vite.config.ts` — `tailwindcss/no-unknown-classes` rule now has `allowlist` with `bg-surface-1`, `bg-surface-2`, `hover:bg-surface-2`
