# Public GitHub repo access hardening

**Date:** 2026-08-10  
**Status:** Draft for implementation  
**Approach:** A — harden public path (server-side private reject + cache split + error handling)  
**Related:** [CONTEXT.md](../../../CONTEXT.md) public surface; multi-user GitHub source resolution

---

## Problem

Two production/local bugs share the public GitHub detail path:

1. **Private leak:** Guest can load a private repo overview at `/{profileName}/repos/{private-repo}` (and via `publicGetRepoOverview` with no session). Confirmed for `dev-hub` on localhost and `api.salahmohsen.com`.
2. **Public fail:** Guest sees “Repository not available” for public repos (e.g. `cilas` on hub). Production `publicGetRepoOverview` / `publicGetRepoBranches` return **500** for public repos while REST public list/tree succeed and cached private overview still returns 200.

---

## Root causes

### Private leak

| Layer       | Behavior                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public RPCs | `withPublicGitHubContext` injects the **tenant owner OAuth token**. GraphQL `repository(owner, name)` returns private repos when that token has access.                                                                                                 |
| No gate     | `getRepoOverview` (and siblings) never reject `isPrivate === true` on the public path.                                                                                                                                                                  |
| Cache       | Resource keys like `repo.overview.v2` are **shared** by public and private fetchers (same `owner` + params). Owner private read can poison guest cache. Profile list already uses `user.profileRepos.v3.public` / `.private` — detail resources do not. |

Profile **list** is correct: public path uses `GET /users/{username}/repos` (public only).

### Public “not available”

| Layer         | Behavior                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API           | Production: GraphQL-backed `publicGetRepo*` fail with **500** for public repos; REST-backed tree/list work. Strong signal: GraphQL path or cache revalidation fails; errors not mapped to null.          |
| Error mapping | Overview throws plain `Error` when `repository` is null and only treats HTTP `status === 404` as not-found — **not** `isGitHubNotFoundError`. Unhandled GraphQL errors surface as INTERNAL_SERVER_ERROR. |
| UI            | `GithubRepoPage` treats any missing overview data (null **or** query error) as the same empty copy: “could not be loaded from the configured public GitHub source.”                                      |
| SSR           | Route loader `void`s `prefetchQuery` without `await`, so SSR often dehydrates mid-fetch; client then hits the failing RPC.                                                                               |

Token health on production (expired OAuth / refresh) is a plausible operational contributor to GraphQL 500s; this design hardens **code** so guests never see private data and public failures degrade cleanly. Ops token repair is out of band but should be verified after deploy.

---

## Goals / non-goals

### Goals

1. Guests and any caller of **public** GitHub RPCs never receive private repository payloads (overview, tree, file, branches, PRs, issues, etc.).
2. Direct URL to a private repo name behaves like unknown: **null / empty / not-found**, not a dedicated “this is private” message (no existence leak).
3. Public and private cache entries never share resource keys.
4. GraphQL not-found / private-as-public map to null/empty, not 500, where handlers already return nullable/empty shapes.
5. UI distinguishes **error** (retryable) vs **not available** (null) for overview.
6. Optional but in-scope: await overview (and branches) prefetch in the public repo route loader so SSR can dehydrate real data when GitHub is healthy.

### Non-goals

- Switching public path to fully anonymous GitHub (Approach B) — optional later hardening.
- Changing owner dashboard private RPCs (`privateGet*`) auth model.
- Migrating historical cache rows (versioned resource keys naturally miss; old keys age out).
- Replacing the owner-token portfolio model for **public** repos (still use tenant OAuth for public GraphQL/REST when needed for rate limits / consistency).

---

## Design

### 1. Public path private rejection (canonical rule)

**Rule:** On the public Octokit path (`getRepoX` / `context.github.publicOctokit`), if the underlying GitHub entity is private, treat as **not found** for that surface:

| Handler return type                                 | On private                       |
| --------------------------------------------------- | -------------------------------- |
| `T \| null` (overview, file content, ref commit, …) | `return null`                    |
| `T[]` (branches, tree, issues, pulls, …)            | `return []`                      |
| Structured empty objects                            | Same as existing not-found paths |

Do **not** throw a distinct “private” error code that the client could use to probe existence.

Implementation preference: one small helper used at the edge of each public fetcher after a successful GitHub response that includes privacy, e.g.:

```ts
function rejectPrivateForPublicSurface<T extends { isPrivate?: boolean | null }>(
  entity: T | null | undefined
): entity is T & { isPrivate: false } {
  return Boolean(entity) && entity.isPrivate !== true;
}
```

Where GraphQL/REST only returns privacy on the parent repository object, check that field before mapping children (e.g. load overview fields or a cheap `repository { isPrivate }` when the resource does not already include it).

**In-scope resource set (one PR):** every dual `publicGet*` / `privateGet*` (or `get*` / `getPrivate*`) pair exposed on `packages/api/src/routers/github.router.ts`, including at least:

- `repo.overview`, `repo.branches`, `repo.tree`, `repo.fileContent`, `repo.refCommit`
- `repo.pulls`, `repo.issues`, `repo.discussions`, `repo.workflowRuns`, `repo.contributors`
- `repo.branch-comparison`, `repo.commitSparkline`, `tree-entry-commits`
- Any other dual repo detail RPC on that router

Package-only helpers (`repo.activityCards`, `repo.recentCommits`, …) are in-scope only if they are (or become) reachable from a public RPC.

**User-level public RPCs** (`publicGetUserPinnedRepos`, activity, contributions, profile) are **out of band for this PR** unless a pinned/list node clearly reuses the same dual fetch helper; do not expand scope to filter every user feed unless needed for the leak.

Pattern: only the **public** export path applies the reject; `getPrivateRepo*` continues to use private Octokit and must **not** apply the reject.

**When to reject vs cache:** run private rejection **before** writing a success entry under a `.public` resource key. Prefer caching the public-safe null/empty result (or skipping cache write on reject) so `.public` never stores a private payload even if a future caller forgets to re-check.

### 2. Cache resource suffix (public vs private)

Mirror `get-profile-repos` (`user.profileRepos.v3.public` | `.private`):

- Every dual-path repo resource gets a suffix: `` `${base}.public` `` / `` `${base}.private` `` (or bump version and include suffix, e.g. `repo.overview.v3.public`).
- Pass suffix from the public vs private wrapper into the shared `_fetch*` so params alone cannot collide.
- Do not read across suffixes.

After deploy, guests never hit owner-written private cache entries.

### 3. Error mapping (GraphQL → null/empty, not 500)

For public (and private where applicable) fetchers that already return null/empty on 404:

- Use `isGitHubNotFoundError(error)` in addition to `getErrorStatusCode(error) === 404`.
- When GraphQL returns `repository: null`, return null/empty — do **not** throw a bare `Error` that bypasses not-found handling.
- Log outcome (`github_*_read_not_found` / private_rejected) without leaking repo privacy to clients.

This reduces false 500s that currently become “Repository not available.”

### 4. UI: error vs empty

In `GithubRepoPage` (and similar explorer shells if they share the same empty state):

| Query state                    | UI                                                                         |
| ------------------------------ | -------------------------------------------------------------------------- |
| `isLoading` / pending, no data | Existing skeleton                                                          |
| `isError`                      | Distinct error empty: load failed; optional retry                          |
| `isSuccess` and `data == null` | Keep not-available copy (public source / not found / private-as-not-found) |
| `isSuccess` and data           | Render overview                                                            |

Do not claim “configured public GitHub source” when the failure is a 500 or network error.

### 5. SSR loader (small)

In `/$profileName/repos/$repo` (and custom-domain `/repos/$repo` if mirrored):

- `await` `ensureQueryData` / `prefetchQuery` for overview (and preferably branches) with **public** options (`isPrivate: false`) so guests dehydrate public-safe data only.
- Do not prefetch private options in the public route loader.

### 6. Tests

| Case                                                     | Expectation                              |
| -------------------------------------------------------- | ---------------------------------------- |
| Public fetcher with fixture `isPrivate: true`            | null / [] — never returns payload fields |
| Public and private cache keys differ for same owner/repo | different resource strings               |
| GraphQL null repository / not-found error                | null / [], no throw                      |
| UI unit or lightweight test optional                     | error vs null empty copy                 |

Prefer pure unit tests around helper + overview mapping/fetch mock; avoid live GitHub in CI.

---

## Data flow (target)

```
Guest → publicGetRepoOverview(profileName, repo)
  → withPublicGitHubContext(tenant OAuth)
  → getRepoOverview → publicOctokit + resource …public
  → if private or not found → null
  → client: success+null → not available; error → error empty

Owner (session, own profile) → privateGetRepoOverview(repo)
  → getPrivateRepoOverview → privateOctokit + resource …private
  → may return isPrivate: true
```

Client already chooses private vs public query options when `user.profileName === route profileName`. No change required to that switch beyond ensuring public always stays safe.

---

## Rollout / verification

1. Unit tests green.
2. Local unauthenticated: `publicGetRepoOverview` for private `dev-hub` → `null` (or empty json), never `isPrivate: true`.
3. Local public repo (e.g. known public name) still 200 with data when GitHub/token healthy.
4. Production after deploy: guest `cilas` either loads or shows **error** empty if GraphQL/token still broken — not silent private leak; confirm private direct URL returns null.
5. If public still 500 after mapping fix, investigate OAuth refresh / GraphQL errors in server logs (ops), not further product gating.

---

## Risks

| Risk                                                        | Mitigation                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miss one public dual endpoint                               | Checklist of `publicGet*` in `github.router.ts` + grep for shared `resource:` without suffix                                                                                                                                             |
| REST tree/file don’t include `private` on directory listing | **Canonical:** on public path, call `octokit.rest.repos.get({ owner, repo })` once (or reuse in-request overview) and if `private === true` return []/null before listing content. Do not invent three competing strategies in the plan. |
| Cache key bump thundering herd                              | Accept; existing freshForMs / local-first still apply                                                                                                                                                                                    |
| Owner cannot open private via public URL while signed in    | Already uses `privateGet*` when session profile matches; verify that path still works                                                                                                                                                    |

---

## Success criteria

- [ ] Unauthenticated `publicGetRepoOverview` for a private repo never returns repository fields.
- [ ] Public and private cache resource keys are distinct for all dual repo resources in scope.
- [ ] GraphQL not-found does not produce 500 for overview/branches.
- [ ] UI shows different copy for query error vs null data.
- [ ] Guest private URL does not render private file tree or commit metadata.
