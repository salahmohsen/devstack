# Project Open Repo + Public Surface Paths

**Date:** 2026-08-09  
**Status:** Design (brainstorm)  
**Related:** [Custom domain browser origin trust](./2026-08-08-custom-domain-browser-origin-trust-design.md), [CONTEXT.md](../../../CONTEXT.md) public GitHub surface / custom domain, `apps/web/src/shared/lib/repo-paths.ts`

## Problem

Portfolio project cards on the home page expose demo links but not navigation into this app’s **public GitHub surface** for linked repos. Paths also differ by host:

- Path mode: `/{profileName}/repos/{repo}`
- Custom domain: `/repos/{repo}`

Hard-coded `/${profileName}/repos` breaks or looks wrong on verified custom domains. Repo privacy is not on the project DTO today (`repos: string[]` URLs only), so clients cannot correctly hide private-repo entry points from guests.

## Product decisions

| Topic                  | Decision                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Destination            | **In-app** public GitHub repo overview (not github.com)              |
| Public repo            | Open control visible to **everyone**                                 |
| Private repo           | Open control only for **portfolio owner** (session matches tenant)   |
| Multi-repo projects    | **One control per resolvable** repo                                  |
| Multi control UI       | **coss ButtonGroup / Group** when 2+                                 |
| Icon                   | GitHub from **react-icons** (e.g. `FaGithub`)                        |
| Placement              | **&lt; md:** under the date; **md+:** next to the project title      |
| Path helper scope (v1) | **All public portfolio chrome** public→public links                  |
| Privacy source         | **Enrich portfolio list** from tenant GitHub (cached where possible) |

## Goals

1. Project cards offer Open repo for each resolvable GitHub URL on the project.
2. Public vs private visibility as above.
3. Correct paths on path mode and custom domain.
4. Shared **public surface** path helper used across public chrome, not only project cards.
5. Fail closed: unknown/unmapped repos → no button; private + non-owner → no button.

## Non-goals (v1)

- External github.com from this control.
- Non-owners opening private in-app repo UI.
- Dashboard/admin route rewrites.
- Inventing repos not already on `project.repos`.
- Full SEO absolute-URL rewrite of every public page (path helpers first; absolute builders optional later).

## Architecture

### 1. Public surface context

```ts
type PublicSurfaceMode = "path" | "custom_domain";

type PublicSurface = {
  mode: PublicSurfaceMode;
  /** Path builder slug; null on custom domain (paths omit profile segment). */
  profileName: string | null;
  /** Tenant slug always known for owner checks / data loaders when resolved. */
  tenantProfileName: string;
};
```

- Resolve once from existing Host / path portfolio resolution (`custom_domain` vs path), same as home loader today.
- Provide to portfolio home and public chrome (React context or props from layout/route — prefer existing route context patterns if present).

### 2. Path helper (web)

Extend or wrap `apps/web/src/shared/lib/repo-paths.ts` (sibling module ok if clearer):

| Helper                            | Path mode                                           | Custom domain   |
| --------------------------------- | --------------------------------------------------- | --------------- |
| `portfolioHomePath(surface)`      | `/{profileName}`                                    | `/`             |
| `reposListPath(surface)`          | `/{profileName}/repos`                              | `/repos`        |
| `repoOverviewPath(surface, repo)` | `/{profileName}/repos/{repo}`                       | `/repos/{repo}` |
| tree/blob                         | existing helpers with `profileName: string \| null` | same            |

Prefer returning **typed TanStack `to` + `params`** where file routes exist; string href only when necessary.

**Migrate public→public nav to the helper:**

- Home project Open repo buttons
- Sidebar public Portfolio / Repositories items
- Topbar / mobile nav Profile & Repositories (public)
- Any home-page / public chrome links to repos list or portfolio root that currently hard-code `/${profileName}/…`

Do **not** change primary-app dashboard/sign-in redirects (`primaryAppUrl`).

### 3. Portfolio DTO enrichment

Add to public project shape (core schema + mapper):

```ts
githubRepos: Array<{
  name: string; // path segment
  fullName: string; // owner/name for a11y/tooltip
  isPrivate: boolean;
}>;
```

- When mapping portfolio projects, for each URL in `repos[]`:
  1. Parse GitHub owner/repo (skip non-GitHub / invalid).
  2. Keep only repos that belong to this tenant’s public GitHub surface (configured owner).
  3. Resolve `isPrivate` via existing GitHub package/overview (or light metadata API) with cache.
  4. Skip on failure (no entry).
- Keep raw `repos: string[]` as today for dashboard/edit; public UI prefers `githubRepos`.

### 4. Client visibility

```ts
const visible = project.githubRepos.filter((r) => !r.isPrivate || isPortfolioOwner);
```

`isPortfolioOwner`: signed-in user’s profile/tenant matches page tenant (same idea as private GitHub chrome on own portfolio).

### 5. Project card UI

- **Controls:** icon button(s) with `FaGithub` (or consistent react-icons GitHub glyph).
- **1 repo:** single button.
- **2+ repos:** coss **`Group` / ButtonGroup** (`packages/ui` group re-exports).
- **Responsive placement:**
  - default (mobile): group **under the date** (description row).
  - `md+`: group **next to the project title**.
- a11y: each control has a text name, e.g. `Open repository {name}`; optional tooltip with `fullName`.
- Navigate with TanStack `Link` (or `navigate`) using surface-aware `repoOverviewPath` / typed route — **not** full page reload to wrong host.

Demo (`demoUrl`) remains separate external action if present.

## Edge cases

| Case                                 | Behavior                                               |
| ------------------------------------ | ------------------------------------------------------ |
| Empty `repos` / no resolvable GitHub | No Open repo controls                                  |
| Private + guest                      | Hidden                                                 |
| Private + owner                      | Shown; in-app private GitHub APIs already owner-scoped |
| Custom domain                        | `/repos/{name}`                                        |
| Path portfolio                       | `/{profileName}/repos/{name}`                          |
| Repo name collision across orgs      | Only tenant-owned fullNames                            |
| Enrichment timeout/error             | Skip that URL; rest of card loads                      |
| Nested experience projects           | Same `githubRepos` if those use `ProjectPublicOutput`  |

## Implementation sketch (for later plan)

1. **core:** `githubRepos` on public project schema (+ types).
2. **api:** portfolio mapper enrichment (parse URLs, GitHub privacy, tenant filter).
3. **web:** surface type + path helpers; route/layout provides `PublicSurface`.
4. **web:** project card Open repo UI (responsive placement, Group, icons).
5. **web:** migrate sidebar / topbar / mobile public links to helper.
6. **tests:** path helper unit tests; optional mapper tests for parse/filter; visibility unit if pure.

## Verification

1. Path mode guest: public repo button → `/{profile}/repos/{repo}`; private hidden.
2. Path mode owner: private button visible and navigates.
3. Custom domain guest: public button → `/repos/{repo}` (same host).
4. Multi-repo: ButtonGroup under date on narrow; beside title at `md+`.
5. Public chrome links never emit `/{profileName}/…` on custom domain Host.
6. Demo link still works when set.

## Success criteria

- [ ] Open repo only for resolvable GitHub repos on the project.
- [ ] Privacy visibility rules enforced client-side from server-enriched `isPrivate`.
- [ ] Correct in-app paths for path and custom domain modes.
- [ ] Shared helper used for public portfolio chrome public→public navigation.
- [ ] Responsive placement and multi-repo group match product decisions.
