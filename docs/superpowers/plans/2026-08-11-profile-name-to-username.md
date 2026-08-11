# Profile name → Better Auth username Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace product `profileName` / `user.profile_name` with Better Auth **username plugin** as the canonical public portfolio handle; rename slug-alias table to `username_slug_alias`; wire avatars to Better Auth `user.image` via `authClient.updateUser` while bytes stay on files-sdk; keep path routing, OAuth auto-suffix usernames, and settings rename.

**Architecture:** Better Auth `username` (unique, path-safe validation/normalization) becomes the public path key previously stored as `profile_name`. Create-hook always sets a unique username (explicit → GitHub login → email local-part → suffix). Former handles live in **`username_slug_alias`** (renamed from `profile_slug_alias`). Public APIs resolve path segment / Host via live `username` then alias. Route/DTOs use `username`. **Avatar:** upload object with files-sdk → public URL (`MEDIA_PUBLIC_URL` or `/api/media`) → persist with **`authClient.updateUser({ image })`** so session cookie refreshes (Better Auth owns the image field; app owns storage). Sign-in stays email/OAuth.

**Tech Stack:** Better Auth `username` + `usernameClient` plugins, `authClient.updateUser` for `image`/`name`/`username`, Drizzle/Postgres, files-sdk + `/api/files` + `/api/media`, oRPC, TanStack Router/Query, `@tsu-stack/core` validators.

**Locked product decisions:**

| Decision              | Value                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical field       | Better Auth `user.username`                                                                                                                                                               |
| Required              | Always set on create (hook + DB `NOT NULL`)                                                                                                                                               |
| OAuth default         | GitHub `login` → email local-part → random; **auto-suffix if taken/reserved (A)**                                                                                                         |
| Explicit taken claim  | Fail (do not silent-rename user choice)                                                                                                                                                   |
| Rename                | Settings; old handle → **`username_slug_alias`**                                                                                                                                          |
| Alias table           | Rename `profile_slug_alias` → **`username_slug_alias`** (schema + repo + migrate)                                                                                                         |
| Charset               | Keep path-safe: 3–30, lowercase, hyphens, reserved segments (not BA default `_`/`.`)                                                                                                      |
| Sign-in by username   | Out of scope for UI (plugin may exist; client still email/OAuth)                                                                                                                          |
| Display name          | Still `user.name`                                                                                                                                                                         |
| Avatar field          | Better Auth core `user.image` (URL string \| null)                                                                                                                                        |
| Avatar bytes          | App: files-sdk `avatars/*` + public GetObject / `/api/media` (not BA upload)                                                                                                              |
| Avatar write path     | `authClient.updateUser({ image: url \| null })` after upload/clear (not `profile.update` for image-only)                                                                                  |
| OAuth vs custom image | Seed `image` from GitHub on **first create/link only**. **Never auto-overwrite** after user set a custom avatar (or cleared). Custom upload wins permanently until user changes it again. |

**Skills / docs:**

- `@better-auth-best-practices` / Better Auth username plugin docs
- `@.agents/auth.md`, `@.agents/core.md`, `@.agents/orpc.md`, `@.agents/end-to-end-features.md`, `@.agents/workflow.md`
- Product glossary: `@CONTEXT.md` (update terms)
- Design lock from session: username = former public path key

---

## File map (decomposition)

### New / renamed core identity

| Path                                                    | Responsibility                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/core/src/profile/types.ts`                    | `UsernameSchema` (ex-`ProfileNameSchema`), rename/update input/output fields                         |
| `packages/core/src/profile/constants.ts`                | Keep reserved paths; rename exports if needed (`RESERVED_USERNAME_PATHS` optional alias)             |
| `packages/core/src/profile/utils.ts`                    | `parseUsername`, `normalizeUsername`, `isReserved…`                                                  |
| `packages/core/src/profile/__tests__/utils.test.ts`     | Rename tests                                                                                         |
| `packages/auth/src/username.ts`                         | **Rename/replace** `profile-name.ts` → resolve unique username (OAuth suffix logic)                  |
| `packages/auth/src/auth.ts`                             | `username()` plugin + client fields; create hook sets `username`; drop `profileName` additionalField |
| `packages/auth/src/index.ts`                            | Export username helpers                                                                              |
| `packages/db/src/schema/auth.schema.ts`                 | `username` (+ optional `displayUsername`); drop `profileName` after migrate                          |
| `packages/db/migrations/<ts>_profile_name_to_username/` | Backfill + rename column / add BA columns                                                            |
| `packages/db/src/repositories/user.repository.ts`       | `findByUsername`, `isUsernameTaken`, `updateUsername`                                                |

### Public resolution (aliases table rename)

| Path                                                            | Responsibility                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/db/src/schema/profile-slug-alias.schema.ts`           | **→ `username-slug-alias.schema.ts`**, table `username_slug_alias`                 |
| `packages/db/src/repositories/*slug*alias*`                     | Rename symbols to username slug alias                                              |
| `packages/api/src/lib/public-portfolio/resolve-context.ts`      | Resolve path segment via username then alias; context field `username`             |
| `packages/api/src/lib/public-portfolio/resolve-context.test.ts` | Full rename of expectations                                                        |
| `packages/api/src/routers/profile.router.ts`                    | `renameUsername` (ex-rename); DTO `username`; aliases on rename                    |
| `packages/api/src/routers/portfolio.router.ts`                  | List/public already uses resolve context                                           |
| `packages/api/src/routers/{domain,github,resume}.router.ts`     | Public inputs using path key                                                       |
| `packages/core/src/portfolio/types.ts`                          | `PortfolioListInput.username` (prefer clean break)                                 |
| `packages/core/src/domain/types.ts`                             | Domain DTOs with public handle                                                     |
| `packages/core/src/profile/types.ts`                            | `ProfileOutput.username`, `PublicUsernameInputSchema`, `RenameUsernameInputSchema` |

### Avatar (Better Auth image + app storage)

| Path                                                            | Responsibility                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/shared/ui/profile-avatar-upload.tsx`              | Upload via files-sdk; call parent with URL                                                                         |
| `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx` | After upload/clear: **`authClient.updateUser({ image })`** + refresh session; stop image-only via `profile.update` |
| `packages/api/src/routers/profile.router.ts`                    | Optional: stop accepting `image` on profile.update (BA owns it) or leave for non-session tools                     |
| `packages/api/src/routers/portfolio.router.ts`                  | Public `image` still from `user.image`                                                                             |
| `apps/web/src/routes/api/media/$.ts`                            | Public avatar proxy (already)                                                                                      |
| `.agents/media-storage.md`                                      | Document BA `updateUser` + key prefix                                                                              |

### Web app

| Path                                                            | Responsibility                                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/(root-layout)/$profileName/**`             | **Rename folder** → `$username/**`; update `createFileRoute` paths + params                                          |
| `apps/web/src/routeTree.gen.ts`                                 | Regenerated by Vite/TanStack                                                                                         |
| `apps/web/src/features/auth/ui/create-an-account-form.tsx`      | Field `username`                                                                                                     |
| `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx` | “Username” UI + rename mutation                                                                                      |
| `apps/web/src/features/profile/api/rename-profile.mutation.ts`  | → `rename-username.mutation.ts`                                                                                      |
| `apps/web/src/shared/lib/session-profile-name.ts`               | → `session-username.ts`                                                                                              |
| `apps/web/src/shared/lib/use-portfolio-profile-name.ts`         | → `use-portfolio-username.ts`                                                                                        |
| `apps/web/src/shared/lib/public-surface.ts`                     | `tenantUsername` / path builders                                                                                     |
| `apps/web/src/shared/lib/repo-paths.ts`                         | Param names in path helpers                                                                                          |
| Features/pages listed in **Appendix A**                         | Mechanical `profileName` → `username` on props/query keys where it means the **public handle** (not GitHub username) |

### Docs

| Path                                         | Responsibility                           |
| -------------------------------------------- | ---------------------------------------- |
| `CONTEXT.md`                                 | Glossary: Username replaces Profile name |
| `AGENTS.md`, `README.md`                     | Path `/{username}`                       |
| `.agents/auth.md` if it mentions profileName | Update                                   |

### Explicit non-goals / do not confuse

- **GitHub username** (`githubUsername`, GitHub API `login`) — **do not rename** to generic “username” without qualification; keep GitHub-specific names.
- **Email templates** prop `username={user.name}` — that is **display name**, not path handle; leave or rename template prop to `displayName` in a separate cleanup.
- **Agent resume-import** `fallbackProfileName` for **person name** — rename carefully; may be display name, not path key (`apps/agent/.../normalize.step.ts`).

---

## Migration strategy (DB)

1. Add columns `username` (text unique nullable first), `display_username` (text nullable) if required by BA plugin.
2. Backfill: `UPDATE "user" SET username = profile_name WHERE username IS NULL`.
3. Set `username NOT NULL`.
4. Drop `profile_name` (prefer drop after code cutover).
5. Unique index on `username` (BA + app).
6. **Rename alias table:**  
   `ALTER TABLE profile_slug_alias RENAME TO username_slug_alias;`  
   Rename PK/unique indexes to match; update Drizzle schema + repository imports.
7. `user.image` already exists (BA core) — no new avatar column; only change **write path** in app.

CLI: follow `@.agents/workflow.md` — `vp run db:generate` / migrate; **never point migrate at prod without confirmation**.

Better Auth: after schema change, regenerate adapter fields if project uses `auth:generate`; re-apply hand-owned columns per existing comments in `auth.schema.ts`.

---

## Avatar / image — what “integrate with Better Auth” means

Better Auth **does not upload files**. Docs only define:

```ts
await authClient.updateUser({
  image: "https://example.com/image.jpg", // URL string’’’
  name: "John Doe"
});
// image may be null to clear (client InferUserUpdateCtx)
```

Server endpoint `POST /update-user` updates `user.image` / `user.name` (and additionalFields) and **refreshes the session cookie** with the new user. OAuth providers map profile pictures into `image` (e.g. GitHub `avatar_url` already in this repo). Microsoft docs show `mapProfileToUser` if you need to re-host a remote picture.

### Split of responsibility (target)

| Layer                      | Owns                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| **files-sdk** `/api/files` | Authz + put object under `{userId}/avatars/{uuid}.ext`                       |
| **Public delivery**        | MinIO `*/avatars/*` policy and/or `GET /api/media/{userId}/avatars/…`        |
| **Better Auth**            | Store **URL** on `user.image`; session/JWT sees new image after `updateUser` |
| **Public portfolio**       | Read `user.image` for hero (already via portfolio list)                      |

### What to implement (avatar task)

1. **Upload flow (settings):**
   - Browser `files.upload("avatars/…")` → `files.url(key)` → public URL.
   - Then **`authClient.updateUser({ image: publicUrl })`** (not `orpc profile.update` for image-only).
   - On clear: `authClient.updateUser({ image: null })` (or `""` if client rejects null — match BA client types; server accepts `null`).
   - `await authClient.getSession()` / rely on cookie update from `updateUser`.

2. **Stop dual paths:** Remove or gate image writes on `profile.update` so there is one source of truth (BA). Contacts/summary/name can stay on oRPC **or** name can also move to `updateUser` later (optional; plan: image via BA only).

3. **OAuth first image (locked):** Map GitHub `avatar_url` → `image` only on **initial user create / first account link** when `image` is empty. After the user **uploads or clears** via settings (`updateUser`), **never** re-apply OAuth avatar on token refresh, re-link, or profile sync. Custom (or explicit clear) wins permanently until the user changes it again.

4. **Optional hardening (in scope if cheap):**
   - Prefer storing **stable public URL** under `MEDIA_PUBLIC_URL` / `/api/media/...` not host-only MinIO if env drifts.
   - On replace avatar, best-effort `files.delete` previous object key parsed from old `user.image` (extractAvatarObjectKey).
   - Do **not** invent a BA file-upload plugin.

5. **Out of avatar scope:** imgproxy transforms, CDN invalidation, media_asset table.

---

### Task 1: Core schemas — `Username` replaces `ProfileName`

**Files:**

- Modify: `packages/core/src/profile/types.ts`
- Modify: `packages/core/src/profile/utils.ts`
- Modify: `packages/core/src/profile/constants.ts` (optional renames + keep set)
- Modify: `packages/core/src/profile/__tests__/utils.test.ts`
- Modify: `packages/core/src/portfolio/types.ts` (`Public…Input` path key field)
- Modify: `packages/core/src/domain/types.ts` if it exposes `profileName`

- [ ] **Step 1: Rename validators**

  - `ProfileNameSchema` → `UsernameSchema` (same Zod rules: min/max, regex, reserved refine).
  - Export deprecated alias only if needed for one PR intermediate: prefer single name.
  - `RenameProfileInputSchema` → `RenameUsernameInputSchema` with field `username`.
  - `PublicProfileNameInputSchema` → `PublicUsernameInputSchema` with optional `username`.
  - `ProfileOutputSchema.profileName` → `username`.

- [ ] **Step 2: Utils**

  - `parseProfileName` → `parseUsername`
  - `normalizeProfileName` → `normalizeUsername`
  - Keep reserved-path helper; used by validator.

- [ ] **Step 3: Unit tests**

```bash
cd packages/core && vp test run src/profile/__tests__/utils.test.ts
```

Expected: PASS after rename.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/profile packages/core/src/portfolio/types.ts packages/core/src/domain/types.ts
git commit -m "refactor(core): rename ProfileName contracts to Username"
```

---

### Task 2: DB schema + migration (username column + alias table rename)

**Files:**

- Modify: `packages/db/src/schema/auth.schema.ts`
- Rename: `packages/db/src/schema/profile-slug-alias.schema.ts` → `username-slug-alias.schema.ts`
- Update: schema barrel exports / relations
- Create: `packages/db/migrations/<timestamp>_profile_name_to_username/migration.sql`
- Modify: `packages/db/src/repositories/user.repository.ts`
- Rename/modify: slug-alias repository module if separate

- [ ] **Step 1: Schema**

```ts
// auth.schema user table (illustrative)
username: text("username").notNull().unique(),
displayUsername: text("display_username"), // if BA plugin requires; can mirror username
// remove profileName after backfill
// user.image already exists — unchanged
```

```ts
// username-slug-alias.schema.ts
export const usernameSlugAlias = pgTable(
  "username_slug_alias",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("username_slug_alias_slug_unique_idx").on(t.slug)]
);
```

- [ ] **Step 2: SQL**

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;
UPDATE "user" SET "username" = "profile_name" WHERE "username" IS NULL;
UPDATE "user" SET "display_username" = "username" WHERE "display_username" IS NULL;
ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");
ALTER TABLE "user" DROP COLUMN IF EXISTS "profile_name";

ALTER TABLE "profile_slug_alias" RENAME TO "username_slug_alias";
-- rename indexes to username_slug_alias_* (match live names via \d in psql / prior migrations)
```

- [ ] **Step 3: Repository**

  - `findByProfileName` → `findByUsername`
  - `isProfileNameTaken` → `isUsernameTaken` (user.username **or** `username_slug_alias.slug`)
  - `updateProfileName` → `updateUsername`
  - Alias repo: table/symbol rename; behavior unchanged

- [ ] **Step 4: Migrate local**

```bash
# Confirm DATABASE_URL is dev (workflow.md)
vp run db:migrate
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(db): username column + username_slug_alias rename"
```

---

### Task 3: Auth — username plugin + create hook (OAuth A)

**Files:**

- Create: `packages/auth/src/username.ts` (from `profile-name.ts`)
- Delete or re-export: `packages/auth/src/profile-name.ts`
- Modify: `packages/auth/src/auth.ts`
- Modify: `packages/auth/src/index.ts`
- Client: `packages/auth` react client plugins if separate file

- [ ] **Step 1: Plugin**

```ts
import { username } from "better-auth/plugins";
import { usernameClient } from "better-auth/client/plugins";

// server plugins: [
username({
  minUsernameLength: PROFILE_NAME_MIN, // or USERNAME_MIN
  maxUsernameLength: PROFILE_NAME_MAX,
  usernameNormalization: (u) => normalizeUsername(u), // lowercase trim
  usernameValidator: async (u) => parseUsername(u).success,
  // validationOrder post-normalization if needed
}),
// ]

// client plugins: [ usernameClient() ]
```

- [ ] **Step 2: `resolveUniqueUsername`**

  Port `resolveUniqueProfileName`:

  1. Explicit username → parse; if taken → **throw TAKEN** (no silent rename).
  2. Else candidates in order: `githubLogin`, `name` slug, `email` local-part, `user-{uuid}`.
  3. If invalid/reserved/taken → suffix `-2`, `-3`, … (decision **A**).
  4. GitHub: read from OAuth profile in hook context when available (`ctx` / account linking path); if only email+name at `user.create`, use name/email (GitHub often puts login in `name` or separate account fetch — verify live OAuth payload; may need `databaseHooks.account.create` or map from `userData` fields Better Auth passes).

- [ ] **Step 3: `user.create.before`**

  - Replace `profileName` assignment with `username` (+ `displayUsername: username` if used).
  - Remove `additionalFields.profileName`.
  - Do **not** require client to send username on OAuth.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(auth): Better Auth username plugin + unique resolve hook"
```

---

### Task 4: API — profile DTO, rename, public resolve

**Files:**

- Modify: `packages/api/src/lib/public-portfolio/resolve-context.ts`
- Modify: `packages/api/src/lib/public-portfolio/resolve-context.test.ts`
- Modify: `packages/api/src/routers/profile.router.ts`
- Modify: `packages/api/src/routers/portfolio.router.ts` (input field names if any)
- Modify: `packages/api/src/routers/domain.router.ts`
- Modify: `packages/api/src/routers/github.router.ts`
- Modify: `packages/api/src/routers/resume.router.ts`
- Modify: `packages/api/src/lib/github/with-public-github-context.ts`
- Modify: `packages/api/src/lib/context/hono/create-context.ts` if it logs profileName

- [ ] **Step 1: Resolve context**

  - `resolveUserIdByProfileName` → `resolveUserIdByUsername`
  - Live lookup: `userRepository.findByUsername(slug)`
  - Alias: unchanged table
  - Returned shape: `{ userId, username, mode }` (rename `profileName` key)

- [ ] **Step 2: Profile router**

  - `toProfileOutput`: `username: user.username`
  - `rename` procedure: input `username`; errors `USERNAME_TAKEN` / `USERNAME_INVALID` (or keep old codes one release — prefer new codes + client map)
  - Alias write uses **old username** string

- [ ] **Step 3: All public procedures**

  - Input `profileName` → `username` in Zod (core `PublicUsernameInputSchema`)
  - Handlers: `pathProfileName: input.username` → `pathUsername`

- [ ] **Step 4: Tests**

```bash
cd packages/api && vp test run src/lib/public-portfolio/resolve-context.test.ts
# + any profile/security tests mentioning profileName
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(api): public resolve and profile rename use username"
```

---

### Task 5: Web routes — `$profileName` → `$username`

**Files:**

- Rename directory: `apps/web/src/routes/(root-layout)/$profileName/` → `$username/`
- All nested route files under it
- Custom-domain `/repos/**` stay; they pass resolved handle as prop
- `apps/web/src/routes/(root-layout)/index.tsx`
- `apps/web/src/routes/sitemap[.]xml.ts`
- `apps/web/src/routes/firebase-messaging-sw[.]js.ts` (comment)
- Regenerated: `apps/web/src/routeTree.gen.ts`

- [ ] **Step 1: Move routes**

  - `createFileRoute("/(root-layout)/$username/")` etc.
  - Params: `params.username`
  - `parseUsername(params.username)`

- [ ] **Step 2: Loader/prefetch**

  - Replace every `getXQueryOptions(profileName)` call that means **tenant handle** with `username` variable (not GitHub login).

- [ ] **Step 3: Dev server / route tree**

```bash
# start or build web so routeTree.gen.ts updates; commit gen file
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): public path param \$username"
```

---

### Task 6: Web session helpers + public surface + path builders

**Files:**

- Rename: `session-profile-name.ts` → `session-username.ts` (+ test)
- Rename: `use-portfolio-profile-name.ts` → `use-portfolio-username.ts`
- Modify: `public-surface.ts`, `repo-paths.ts`, `repo-paths.branch-nav.test.ts`
- Modify: `resolve-public-scope-nav.ts` (+ test)
- Modify: `command-palette/registry.ts`, `use-command-items.ts`

- [ ] **Step 1: Session**

```ts
export function sessionUsernameFromUser(user: unknown): string | null {
  // read user.username from Better Auth session
}
```

- [ ] **Step 2: Public surface type**

  - `tenantProfileName` → `tenantUsername`
  - Path builders emit `/${username}/…` on path mode

- [ ] **Step 3: Tests**

```bash
cd apps/web && vp test run src/shared/lib/session-username.test.ts src/shared/lib/repo-paths.branch-nav.test.ts src/shared/lib/resolve-public-scope-nav.test.ts
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): session and public surface use username"
```

---

### Task 7: Features / pages — mechanical prop & query rename

**Scope:** Every file in **Appendix A** where `profileName` means **portfolio handle**.

**Rules:**

- Prop `profileName: string` (tenant path key) → `username: string`
- Query option second arg / key factory: use `username`
- **Do not** rename GitHub fields: `githubUsername`, Octokit `login`, sparkline “author”, etc.
- Compare “own profile” with `session.user.username === route.username`

- [ ] **Step 1: Features**

  - `features/portfolio/*`, `features/github/*` (setup status, profile repos — handle arg only)
  - `features/domain/api/resolve-public-portfolio.query.ts`
  - `features/profile/api/rename-*.ts`
  - `features/auth/ui/create-an-account-form.tsx` — field username + `UsernameSchema`

- [ ] **Step 2: Pages**

  - `home-page/**`, `github-repo/**`, `github-repos/**`, `community-landing/**`
  - `dashboard/settings/ui/profile-settings.tsx`, `domain-settings.tsx`

- [ ] **Step 3: Layout widgets**

  - `sidebar.tsx`, `github-public-topbar.tsx`, `github-public-mobile-nav.tsx`, `public-scope-nav.tsx`

- [ ] **Step 4: Typecheck**

```bash
vp run -w fix
# or package-local vp check in web/api/core/auth/db
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(web): plumb username through portfolio and github public UI"
```

---

### Task 8: Settings UI — Username copy + rename

**Files:**

- Modify: `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx`
- Modify: rename mutation hook file

- [ ] **Step 1: Copy (locked)**

  - Section title: **Username**
  - Description: Used in your public URL. Changing it keeps the old path as a redirect.
  - Field label: **Username**
  - Helper: 3–30 lowercase letters, numbers, and hyphens
  - Preview: `/{username}` + absolute URL, Copy / Open
  - Submit: **Save** or **Update username** (not “Rename profile name”)

- [ ] **Step 2: Wire**

  - Form default `session.user.username` / profile query `.username`
  - Mutation → `profile.rename` with `{ username }`
  - Toast errors for TAKEN / INVALID
  - Invalidate session (`authClient.getSession`) + profile query

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): username settings copy and rename flow"
```

---

### Task 9: Signup form

**Files:**

- Modify: `apps/web/src/features/auth/ui/create-an-account-form.tsx`
- Check: `sign-in-form.tsx` only if it shows profileName (usually not)

- [ ] **Step 1:** Field `username` (required for email signup), validated with `UsernameSchema`, sent as Better Auth additional/plugin field (`username` per plugin).
- [ ] **Step 2:** OAuth buttons: no username field; server hook auto-assigns (**A**).
- [ ] **Step 3:** Commit

```bash
git commit -m "feat(web): signup collects username for email registration"
```

---

### Task 10: Docs + glossary + agent notes

**Files:**

- Modify: `CONTEXT.md`, `AGENTS.md`, `README.md`
- Modify: `.agents/auth.md` if present mentions
- Optional: historical specs **not** rewritten (leave as archive); new plan is source of truth

- [ ] **Step 1: CONTEXT.md**

  - **Username** (`username`): public URL slug…
  - Deprecate “Profile name” term or mark historical
  - Slug alias: former **username**

- [ ] **Step 2: README paths** `/{username}`

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: glossary and paths use username"
```

---

### Task 11: Agent package edge cases

**Files:**

- `apps/agent/src/mastra/workflows/resume-import-workflow/normalize.step.ts` — inspect `fallbackProfileName`; only rename if it means path handle (likely **display name** — document and skip or rename to `fallbackDisplayName`)

- [ ] **Step 1:** Grep agent for `profileName` / `profile_name`
- [ ] **Step 2:** Fix only true handle references
- [ ] **Step 3:** Commit if any changes

---

### Task 12: Avatar — Better Auth `updateUser` + files-sdk

**Files:**

- Modify: `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx`
- Modify: `apps/web/src/shared/ui/profile-avatar-upload.tsx` (only if callback contract changes)
- Modify: `packages/api/src/routers/profile.router.ts` (drop or ignore `image` on profile.update)
- Modify: `.agents/media-storage.md`
- Optional: delete previous object on replace using `extractAvatarObjectKey`

**Better Auth docs (required reading for implementer):**

- Users & accounts → `authClient.updateUser({ image, name })`  
  https://www.better-auth.com/docs/concepts/users-accounts
- Client accepts `image?: string | null`
- Server refreshes session cookie after update

**Not in BA:** multipart upload, S3, image processing — stay files-sdk.

- [ ] **Step 1: Wire settings**

```ts
// after successful files upload
const { error } = await authClient.updateUser({ image: publicUrl });
if (error) toast.error(...);
await authClient.getSession(); // belt-and-suspenders if cookie already updated

// clear
await authClient.updateUser({ image: null });
```

- [ ] **Step 2: Remove image-only oRPC path** from `handleAvatarUrlChange` / `ProfileUpdateInput.image` if no longer needed.

- [ ] **Step 3: Smoke**

  - Upload avatar → session avatar + public portfolio hero update without full page profile form save
  - Clear avatar → null image, placeholder UI
  - GitHub signup seeds OAuth image when empty
  - After custom upload (or clear), reconnect/refresh GitHub does **not** replace `user.image`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): persist avatar via Better Auth updateUser"
```

---

### Task 13: Full verification

- [ ] **Step 1: Automated**

```bash
vp run -w fix
# targeted tests
cd packages/api && vp test run src/lib/public-portfolio/resolve-context.test.ts
cd packages/core && vp test run src/profile
# security ladder tests if they reference profileName
```

- [ ] **Step 2: Manual smoke**

  1. Email signup with username → public `/{username}` works
  2. GitHub OAuth signup → auto username; collision gets `-2`
  3. Settings change username → old path still resolves (alias); new path works
  4. Custom domain `/` still resolves owner
  5. Own vs guest GitHub private/public queries still key off `session.username === route.username`
  6. Reserved path (`/dashboard`) never treated as username

- [ ] **Step 3: Final commit** if leftovers

---

## Appendix A — Code inventory (deprecated profile name → username)

Every path below is in scope for handle rename unless marked **SKIP** (display name / GitHub / historical docs).

### packages/core

| File                                  | Notes                                         |
| ------------------------------------- | --------------------------------------------- |
| `src/profile/types.ts`                | Schema + ProfileOutput + rename/public inputs |
| `src/profile/utils.ts`                | parse/normalize                               |
| `src/profile/constants.ts`            | reserved paths                                |
| `src/profile/__tests__/utils.test.ts` | tests                                         |
| `src/portfolio/types.ts`              | list input path key                           |
| `src/domain/types.ts`                 | domain public fields                          |

### packages/auth

| File                  | Notes                          |
| --------------------- | ------------------------------ |
| `src/auth.ts`         | additionalFields + create hook |
| `src/profile-name.ts` | **→ username.ts**              |
| `src/index.ts`        | exports                        |

### packages/db

| File                                      | Notes                                     |
| ----------------------------------------- | ----------------------------------------- |
| `src/schema/auth.schema.ts`               | column                                    |
| `src/schema/profile-slug-alias.schema.ts` | **→ username-slug-alias**                 |
| `src/repositories/user.repository.ts`     | find/taken/update + alias table name      |
| slug-alias repository (if any)            | rename symbols                            |
| `migrations/*profile*`                    | historical only; new migration for rename |

### packages/api

| File                                               | Notes                             |
| -------------------------------------------------- | --------------------------------- |
| `src/lib/public-portfolio/resolve-context.ts`      | core resolve                      |
| `src/lib/public-portfolio/resolve-context.test.ts` | tests                             |
| `src/routers/profile.router.ts`                    | get/update/rename                 |
| `src/routers/portfolio.router.ts`                  | public list                       |
| `src/routers/domain.router.ts`                     | public domain + URLs              |
| `src/routers/github.router.ts`                     | public github + profileName input |
| `src/routers/resume.router.ts`                     | public default resume             |
| `src/lib/github/with-public-github-context.ts`     | tenant resolve                    |
| `src/lib/context/hono/create-context.ts`           | logging fields if any             |

### apps/web — routes

| File                                   | Notes                           |
| -------------------------------------- | ------------------------------- |
| `routes/(root-layout)/$profileName/**` | **rename tree to `$username`**  |
| `routes/(root-layout)/index.tsx`       | custom domain home              |
| `routes/(root-layout)/repos/**`        | pass username prop from resolve |
| `routes/sitemap[.]xml.ts`              | URLs                            |
| `routes/api/resume/download/index.ts`  | query profileName → username    |
| `routes/firebase-messaging-sw[.]js.ts` | comment                         |
| `routeTree.gen.ts`                     | generated                       |

### apps/web — shared

| File                                               | Notes                         |
| -------------------------------------------------- | ----------------------------- |
| `shared/lib/session-profile-name.ts` (+ test)      | → session-username            |
| `shared/lib/use-portfolio-profile-name.ts`         | → use-portfolio-username      |
| `shared/lib/public-surface.ts`                     | tenant handle                 |
| `shared/lib/repo-paths.ts` (+ branch-nav test)     | path builders                 |
| `shared/lib/resolve-public-scope-nav.ts` (+ test)  | nav                           |
| `shared/lib/command-palette/registry.ts`           |                               |
| `shared/lib/command-palette/use-command-items.ts`  |                               |
| `shared/lib/github-repo-commit-sparkline.query.ts` | only if tenant handle, not GH |
| `shared/lib/use-repo-route-links.ts`               |                               |
| `shared/ui/repo-commit-sparkline*.tsx`             | prop rename if handle         |
| `shared/ui/repository-row.tsx`                     |                               |

### apps/web — features

| File                                                    | Notes                         |
| ------------------------------------------------------- | ----------------------------- |
| `features/auth/ui/create-an-account-form.tsx`           |                               |
| `features/auth/ui/sign-in-form.tsx`                     | verify; likely no path handle |
| `features/profile/api/rename-profile.mutation.ts`       | rename file                   |
| `features/portfolio/api/get-portfolio-list.query.ts`    |                               |
| `features/portfolio/api/get-default-resume.query.ts`    |                               |
| `features/domain/api/resolve-public-portfolio.query.ts` |                               |
| `features/github/api/get-github-setup-status.query.ts`  | handle arg                    |
| `features/github/api/get-github-profile-repos.query.ts` | handle arg                    |
| `features/github/ui/github-repo-combobox.tsx`           |                               |
| `features/github/ui/github-repo-multi-combobox.tsx`     |                               |

### apps/web — pages / widgets

| File                                                    | Notes                                          |
| ------------------------------------------------------- | ---------------------------------------------- |
| `pages/dashboard/settings/ui/profile-settings.tsx`      | Username UI + rename + **avatar → updateUser** |
| `shared/ui/profile-avatar-upload.tsx`                   | files-sdk only; parent persists via BA         |
| `pages/dashboard/settings/ui/domain-settings.tsx`       | path URL display                               |
| `pages/home-page/**`                                    | home + github queries                          |
| `pages/github-repo/**`                                  | all api + ui with profileName prop             |
| `pages/github-repos/**`                                 |                                                |
| `pages/community-landing/ui/community-landing-page.tsx` |                                                |
| `widgets/layout/ui/sidebar.tsx`                         |                                                |
| `widgets/layout/ui/github-public-topbar.tsx`            |                                                |
| `widgets/layout/ui/github-public-mobile-nav.tsx`        |                                                |
| `widgets/layout/ui/public-scope-nav.tsx`                |                                                |

### apps/agent

| File                    | Notes                                                     |
| ----------------------- | --------------------------------------------------------- |
| `.../normalize.step.ts` | **AUDIT** — likely display name; SKIP or rename carefully |

### docs (update living, not all history)

| File                                   | Notes                             |
| -------------------------------------- | --------------------------------- |
| `CONTEXT.md`                           | **required**                      |
| `AGENTS.md`                            | **required**                      |
| `README.md`                            | **required**                      |
| `docs/superpowers/specs/*profileName*` | optional archive; no need rewrite |

### SKIP / careful

| Pattern                                | Why               |
| -------------------------------------- | ----------------- |
| Email templates `username={user.name}` | Display name      |
| GitHub `githubUsername`, API `login`   | Different domain  |
| `packages/core/src/github-config/*`    | GitHub only       |
| Old migrations / snapshots             | Immutable history |

---

## Risk register

| Risk                                            | Mitigation                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Session JWT/cache still has `profileName`       | Force session refresh after migrate; ensure BA returns `username`     |
| OAuth create missing GitHub login in `userData` | Log payload once in dev; fallback email slug + suffix                 |
| Route rename breaks bookmarks in tests          | Use redirect? **No** — URLs stay `/{handle}`; only param name changes |
| Partial rename leaves type errors               | Task 7 ends with workspace `vp run -w fix`                            |
| Security tests use `profileName`                | Update ladder tests in same PR as resolve-context                     |

---

## Out of scope

- Username + password sign-in UI
- Changing custom-domain verification model
- imgproxy / CDN pipeline beyond existing `MEDIA_PUBLIC_URL` + `/api/media`
- Generic `media_asset` table

**Now in scope (was out):** `username_slug_alias` table rename; avatar via BA `updateUser` + files-sdk.

---

## Execution notes

- Prefer **one vertical slice** after core+db+auth: resolve + one public page, then mechanical web rename.
- Do **not** leave dual-write `profileName` + `username` longer than one PR if avoidable.
- Commit frequency: per task headers above.
