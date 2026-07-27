# GitHub Repo Page (current)

## Status

Current-state summary for the **multi-user** public GitHub repo experience.
Older “public-owner only” / `portfolio-v2` / `{-$locale}` notes are obsolete.

## Surfaces

| URL shape                                    | When                                 |
| -------------------------------------------- | ------------------------------------ |
| `/{profileName}/repos`, `…/$repo`, tree/blob | Primary app host path portfolio      |
| `/repos`, `…/$repo`, tree/blob               | Verified **custom domain** Host only |

On the primary app host, bare `/repos` must not act as a global site-owner hub (redirect or empty). Use `useRepoRouteLinks` / `repo-paths` helpers so tree/blob links stay profile-aware.

## What Exists Now

- Routes under `apps/web/src/routes/(root-layout)/$profileName/repos/` and `(root-layout)/repos/`.
- Public GitHub chrome: `apps/web/src/widgets/layout/` (`github-public-topbar`, mobile nav).
- Pages: `apps/web/src/pages/github-repo/`, `github-repos/`.
- API: public procedures take `profileName` (and Host from context) → `withPublicGitHubContext` / `resolvePublicGitHubSourceForUser(userId)`.
- Branch comparison: read-only banner; external compare still goes to GitHub.com.

## Constraints

- **Per-tenant GitHub** — each user’s OAuth + `github_config`; no global first-account resolution.
- Prefer TanStack `Link` with profile-aware `to` values; branch switch may still use `window.location.assign` in places.
- There is no per-viewer GitHub App installation flow for visitors.

## Important Files

- `apps/web/src/pages/github-repo/ui/github-repo-page.tsx`
- `apps/web/src/pages/github-repo/ui/repo-explorer-layout.tsx`
- `apps/web/src/shared/lib/use-repo-route-links.ts`
- `packages/api/src/lib/github/with-public-github-context.ts`
- `packages/api/src/routers/github.router.ts`
- `packages/github/src/shared/public-github-source.ts`

## Known Gaps

- No in-app compare view; compare links remain external to GitHub.com.
