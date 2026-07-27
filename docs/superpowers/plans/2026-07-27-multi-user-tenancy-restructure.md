# Multi-User Tenancy Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-portfolio app into invite-gated multi-user tenancy (`userId` on all domain rows), public portfolios at `/{profileName}`, optional verified custom domains (Host → portfolio at `/`), free OSS / BYO AI+Resend posture — no Seeker CRM, billing, or TLS automation in this epic.

**Architecture:** User-as-tenant: every private domain row carries `userId`. Public resolution: (1) verified custom domain Host → user at `/`, (2) path `/{profileName}` → user, (3) primary app `/` → community landing. Dashboard/auth stay on primary app origin. Registration: invite-only after bootstrap. TLS is operator-only (Cloudflare/Caddy); app only DNS-verifies and routes.

**Tech Stack:** Better Auth, Drizzle/Postgres, `@tsu-stack/core` Zod, oRPC, TanStack Start/Router/Query, `@tsu-stack/ui` (coss), existing Resend package (optional).

**Spec:** `docs/superpowers/specs/2026-07-27-multi-user-tenancy-restructure-design.md`  
**Order:** `@.agents/end-to-end-features.md`, `@.agents/workflow.md` (migrations), `@.agents/auth.md`, `@.agents/orpc.md`, `@.agents/core.md`

**Out of scope:** Seeker CRM, Stripe, platform-paid AI, TLS cert issuance, `SINGLE_USER_MODE`, marketplace.

**PR / phase map:** Tasks are grouped so each phase is shippable. Prefer one branch with sequential commits matching Task numbers; optional PR splits = Phase headers.

---

## File Structure

| Action | Path                                                                                                                | Responsibility                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Modify | `packages/auth/src/auth.ts`                                                                                         | Invite gate; `profileName` additionalFields; remove REGISTRATION_CLOSED |
| Regen  | `packages/db/src/schema/auth.schema.ts`                                                                             | Via `auth:generate` only                                                |
| Create | `packages/db/src/schema/invite.schema.ts`                                                                           | Invite codes                                                            |
| Create | `packages/db/src/schema/profile-slug-alias.schema.ts`                                                               | Old profileName redirects                                               |
| Create | `packages/db/src/schema/user-custom-domain.schema.ts`                                                               | Custom domains                                                          |
| Modify | `packages/db/src/schema/{experience,project,stack,resume,portfolio-entry,project-stack-scan}.schema.ts`             | `userId` + composite uniques                                            |
| Modify | `packages/db/src/schema/index.ts` + `relations.ts`                                                                  | Export + relations                                                      |
| Create | migrations via `vp run db:generate`                                                                                 | Backfill `userId`, new tables                                           |
| Modify | `packages/db/src/repositories/*.ts`                                                                                 | Scope all queries by `userId`                                           |
| Create | `packages/db/src/repositories/invite.repository.ts`                                                                 | Invite CRUD                                                             |
| Create | `packages/db/src/repositories/profile-slug-alias.repository.ts`                                                     | Alias resolve/create                                                    |
| Create | `packages/db/src/repositories/user-custom-domain.repository.ts`                                                     | Domain CRUD + verify lookup                                             |
| Create | `packages/core/src/profile/*`                                                                                       | profileName rules, reserved paths                                       |
| Create | `packages/core/src/invite/*`                                                                                        | Invite input/output schemas                                             |
| Create | `packages/core/src/domain/*`                                                                                        | Custom domain schemas + hostname normalize                              |
| Modify | `packages/api/src/lib/procedures/factory.ts`                                                                        | Keep protected; optional helpers                                        |
| Create | `packages/api/src/lib/public-portfolio/resolve-context.ts`                                                          | Host + path → userId                                                    |
| Create | `packages/api/src/routers/invite.router.ts`                                                                         | list/create/revoke (protected)                                          |
| Create | `packages/api/src/routers/domain.router.ts`                                                                         | get/set/verify/remove                                                   |
| Modify | `packages/api/src/routers/{experiences,projects,stacks,resume,portfolio,profile,onboarding,agent,github}.router.ts` | Pass `userId`                                                           |
| Modify | `packages/api/src/routers/index.ts`                                                                                 | Mount invite + domain                                                   |
| Modify | `apps/web/src/features/auth/ui/create-an-account-form.tsx`                                                          | invite code + profileName                                               |
| Create | `apps/web/src/features/invite/*`                                                                                    | Settings invite API + UI                                                |
| Create | `apps/web/src/features/domain/*`                                                                                    | Domain settings API + UI                                                |
| Modify | `apps/web/src/pages/dashboard/settings/*`                                                                           | Nav + profileName + domain                                              |
| Create | `apps/web/src/routes/(root-layout)/$profileName/**`                                                                 | Public portfolio by path                                                |
| Modify | `apps/web/src/routes/(root-layout)/index.tsx`                                                                       | Community landing vs custom-domain root (Host)                          |
| Modify | `apps/web/src/pages/home-page/*`                                                                                    | Accept portfolio user context                                           |
| Modify | `CONTEXT.md`                                                                                                        | Glossary terms                                                          |
| Modify | README / self-host docs                                                                                             | Free OSS, BYO keys, domain+TLS operator note                            |

---

## Phase A — Identity, invites, profileName

### Task 1: Core — profileName validation + reserved paths

**Files:**

- Create: `packages/core/src/profile/constants.ts`
- Create: `packages/core/src/profile/types.ts`
- Create: `packages/core/src/profile/utils.ts`
- Create: `packages/core/src/profile/index.ts`
- Create: `packages/core/src/profile/__tests__/utils.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add reserved paths + schema**

```ts
// packages/core/src/profile/constants.ts
export const PROFILE_NAME_MIN = 3;
export const PROFILE_NAME_MAX = 30;
export const PROFILE_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** First path segment reserved — never a profileName */
export const RESERVED_PROFILE_PATHS = [
  "app",
  "api",
  "dashboard",
  "settings",
  "login",
  "sign-in",
  "signup",
  "create-an-account",
  "admin",
  "jobs",
  "applications",
  "resumes",
  "stacks",
  "projects",
  "experiences",
  "onboarding",
  "health",
  "assets",
  "static",
  "www",
  "mail",
  "support",
  "help",
  "privacy-policy",
  "terms-of-service",
  "repos",
  "playground",
  "invite",
  "account",
  "profile"
] as const;

export const RESERVED_PROFILE_PATH_SET = new Set<string>(RESERVED_PROFILE_PATHS);
```

```ts
// packages/core/src/profile/types.ts
import { z } from "zod";
import {
  PROFILE_NAME_MAX,
  PROFILE_NAME_MIN,
  PROFILE_NAME_REGEX,
  RESERVED_PROFILE_PATH_SET
} from "./constants";

export const ProfileNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(PROFILE_NAME_MIN)
  .max(PROFILE_NAME_MAX)
  .regex(PROFILE_NAME_REGEX, "Use lowercase letters, numbers, and single hyphens")
  .refine((s) => !RESERVED_PROFILE_PATH_SET.has(s), "This name is reserved");
```

```ts
// packages/core/src/profile/utils.ts
import { RESERVED_PROFILE_PATH_SET } from "./constants";
import { ProfileNameSchema } from "./types";

export function normalizeProfileName(input: string): string {
  return input.trim().toLowerCase();
}

export function isReservedProfilePath(segment: string): boolean {
  return RESERVED_PROFILE_PATH_SET.has(segment.trim().toLowerCase());
}

export function parseProfileName(input: string) {
  return ProfileNameSchema.safeParse(normalizeProfileName(input));
}
```

- [ ] **Step 2: Unit tests for reserved + valid names**

```ts
// packages/core/src/profile/__tests__/utils.test.ts
import { describe, expect, it } from "vitest";
import { isReservedProfilePath, parseProfileName } from "../utils";

describe("parseProfileName", () => {
  it("accepts salah", () => {
    expect(parseProfileName("Salah").success).toBe(true);
    expect(parseProfileName("Salah").data).toBe("salah");
  });
  it("rejects dashboard", () => {
    expect(parseProfileName("dashboard").success).toBe(false);
  });
  it("rejects bad chars", () => {
    expect(parseProfileName("Hello World").success).toBe(false);
  });
});

describe("isReservedProfilePath", () => {
  it("flags api", () => {
    expect(isReservedProfilePath("api")).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd packages/core && vp test src/profile/__tests__/utils.test.ts
```

Expected: PASS

- [ ] **Step 4: Export from core barrel + commit**

```bash
git add packages/core
git commit -m "feat(core): profileName validation and reserved paths"
```

---

### Task 2: DB — invite + profile_slug_alias tables

**Files:**

- Create: `packages/db/src/schema/invite.schema.ts`
- Create: `packages/db/src/schema/profile-slug-alias.schema.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/relations.ts` (if used)
- Migration via `vp run db:generate`

- [ ] **Step 1: Define invite schema**

```ts
// packages/db/src/schema/invite.schema.ts
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth.schema.ts";

export const invite = pgTable(
  "invite",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null"
    }),
    usedByUserId: text("used_by_user_id").references(() => user.id, {
      onDelete: "set null"
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("invite_code_unique_idx").on(t.code)]
);
```

- [ ] **Step 2: Define profile_slug_alias schema**

```ts
// packages/db/src/schema/profile-slug-alias.schema.ts
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth.schema.ts";

export const profileSlugAlias = pgTable(
  "profile_slug_alias",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("profile_slug_alias_slug_unique_idx").on(t.slug)]
);
```

- [ ] **Step 3: Export schemas + generate migration**

```bash
# export from packages/db/src/schema/index.ts
vp run db:generate
```

- [ ] **Step 4: Verify DATABASE_URL is not production; migrate**

```bash
vp run db:migrate
```

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add invite and profile_slug_alias tables"
```

---

### Task 3: Better Auth — profileName field + invite-gated registration

**Files:**

- Modify: `packages/auth/src/auth.ts`
- Run: `packages/db` `pnpm run auth:generate`
- Create: `packages/db/src/repositories/invite.repository.ts`
- Possibly hand-add unique index in a follow-up migration if generator omits it

**Note:** `auth.schema.ts` is **generated** — never hand-edit long-term. Add `profileName` via `user.additionalFields` then regenerate.

**Frozen signup rules:**

- **Email/password:** requires `profileName` + valid `inviteCode` (unless bootstrap: zero users in DB).
- **OAuth (GitHub) after bootstrap:** invitees open `/sign-in?invite=CODE` (or create-account with invite); app sets short-lived invite cookie, then user continues with GitHub. Create hook consumes cookie + marks invite used. Generate `profileName` from GitHub login (slugify + suffix if taken); rename later in settings. Bootstrap (zero users): OAuth allowed without invite.
- **`inviteCode` is never a column on `user`.** Only `profileName` is stored on `user`.
- **Invite single-use:** `markUsed` must be `UPDATE … WHERE used_at IS NULL`. If 0 rows updated after user was created, fail closed (do not leave a second account on a spent invite — delete user in after-hook or throw and rely on transaction if available).

**Primary invite plumbing (do this first):**

1. `profileName` = `user.additionalFields` with `unique: true` if supported by Better Auth version; always add a **Postgres unique index** on `user.profile_name` in migration if generate does not.
2. Signup request carries `inviteCode` as a **non-persisted** field: prefer Better Auth `user.additionalFields` with `input: true` only if it can be stripped in `before` hook and **not** written to DB. If the generator would create `invite_code` on `user`, **do not** use additionalFields for invite — use **fallback** below.
3. In `user.create.before`: bootstrap OR validate invite row; parse/normalize `profileName`; ensure unique vs `user.profile_name` + `profile_slug_alias.slug`; return data **without** inviteCode.
4. In `user.create.after`: mark invite used (race-safe: update only if `used_at` is null).

**Fallback only if primary cannot pass inviteCode into the hook:** oRPC `auth.preflightInvite({ inviteCode })` sets a short-lived httpOnly cookie; create hook reads cookie and clears it. Do not invent a third path.

- [ ] **Step 1: Add profileName only to Better Auth additionalFields**

```ts
profileName: {
  type: "string",
  required: false, // OAuth may omit; hook fills from GitHub login
  unique: true, // if supported
  input: true
}
```

- [ ] **Step 2: Implement invite + profileName in create hooks** (primary path above). Throw `APIError` with codes `INVITE_INVALID` | `REGISTRATION_CLOSED` replaced by invite failures | `PROFILE_NAME_TAKEN`.

- [ ] **Step 3: Regenerate auth schema**

```bash
cd packages/db && pnpm run auth:generate
```

Expected: `user.profile_name` column. Confirm **no** `invite_code` column on user.

- [ ] **Step 4: Migration + backfill existing sole user**

```bash
vp run db:generate
```

Edit migration so that after adding nullable `profile_name`:

```sql
-- Backfill existing users before NOT NULL (adjust slugify to match app helper)
UPDATE "user"
SET profile_name = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE profile_name IS NULL OR profile_name = '';

-- Ensure uniqueness if two empty names: append left(id, 6) in a second statement if needed
ALTER TABLE "user" ALTER COLUMN profile_name SET NOT NULL;
-- Unique index if not present:
CREATE UNIQUE INDEX IF NOT EXISTS user_profile_name_unique ON "user" (profile_name);
```

Manually verify the sole maintainer can open `/{profile_name}` after migrate. If slugify of `name` is reserved or empty, set an explicit value in SQL for that row.

```bash
# Confirm DATABASE_URL is not production
vp run db:migrate
```

- [ ] **Step 5: invite.repository**

Methods: `findValidByCode(code)`, `create({ code, createdByUserId, expiresAt })`, `markUsed(id, userId)` (WHERE used_at IS NULL), `listByCreator(userId)`, `revoke(id, userId)`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(auth): invite-gated signup and user.profileName"
```

---

### Task 4: API + web — invites settings + signup form

**Files:**

- Create: `packages/core/src/invite/types.ts` + index
- Create: `packages/api/src/routers/invite.router.ts`
- Modify: `packages/api/src/routers/index.ts`
- Create: `apps/web/src/features/invite/api/*`
- Create: `apps/web/src/pages/dashboard/settings/ui/invite-settings.tsx` (or section)
- Modify: settings layout / nav
- Modify: `apps/web/src/features/auth/ui/create-an-account-form.tsx`

**Security sequencing note:** After Task 4, a second user can exist, but domain tables are still **globally unscoped** until Phase B (Tasks 6–8). **Do not dogfood multi-user CRUD** and do not invite real users until Task 8 lands — or the Task 6 backfill-to-first-user will attach all rows to the first account only while both users share unscoped lists.

- [ ] **Step 1: oRPC invite router**

```ts
// list, create, revoke — all protectedProcedure
// create: generate crypto random code, insert, return code
// revoke: only creator, only if unused
```

- [ ] **Step 2: Settings UI** — list codes, create, copy link `/sign-in/create-an-account?invite=CODE`, revoke.

- [ ] **Step 3: Signup form** — fields: email, password, name, profileName, inviteCode (prefill from search param). Pass `profileName` as user additional field; pass `inviteCode` only via the **primary** mechanism chosen in Task 3 (never expect it on session.user).

- [ ] **Step 4: Manual check** — bootstrap user; create invite; second user signs up; third without invite fails. Confirm second user has distinct `profileName`. Stop before multi-user data testing until Phase B.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): invite settings and signup with profileName"
```

---

### Task 5: Profile rename + slug aliases

**Files:**

- Create: `packages/db/src/repositories/profile-slug-alias.repository.ts`
- Modify: `packages/api/src/routers/profile.router.ts` (or new procedure)
- Modify: settings profile UI

- [ ] **Step 1: `profile.rename({ profileName })`**

Transaction:

1. Load current user
2. Parse new name; uniqueness vs other users + aliases
3. Insert alias row for **old** profileName
4. Update `user.profileName`
5. If new name equals an alias owned by self, delete that alias row

- [ ] **Step 2: Settings UI** — edit profileName, show public path URL.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(profile): renamable profileName with slug aliases"
```

---

## Phase B — Tenant columns + scoped data access

### Task 6: Schema — add `userId` to domain tables

**Files:**

- Modify: experience, project, stack, resume, portfolio_entry, project_stack_scan schemas
- Custom SQL migration may be needed for backfill (edit generated migration carefully)

**Join tables:** `project_stack`, `stack_dependency` do **not** get `userId`. Access only through parent `project` / `stack` rows already filtered by `userId` (merge, detect, organize flows included).

- [ ] **Step 1: Add nullable `userId` FK columns** in schema files

```ts
userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
// after backfill: .notNull()
```

- [ ] **Step 2: Change stack unique** from global `name` to `(userId, name)`.

- [ ] **Step 3: `portfolio_entry`** — unique on `(userId, type, entityId)` (replace global type+entity unique if present).

- [ ] **Step 4: Resume default** — partial unique index one default per userId (raw SQL in migration if Drizzle limited).

- [ ] **Step 5: Generate migration; then edit migration SQL to:**

```sql
-- after ADD COLUMN nullable:
UPDATE experience SET user_id = (SELECT id FROM "user" ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL;
-- same for project, stack, resume, portfolio_entry, project_stack_scan
-- then ALTER SET NOT NULL
```

If zero users and rows exist: fail migration or delete orphans (dev only — comment in migration).

- [ ] **Step 6: Check DATABASE_URL; migrate**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(db): userId on domain tables with backfill"
```

---

### Task 7: Repositories — require userId

**Files:**

- Modify: `experience.repository.ts`, `project.repository.ts`, `stack.repository.ts`, `resume.repository.ts`, `portfolio-entry.repository.ts`, `onboarding-apply.repository.ts`, related

- [ ] **Step 1: Replace signatures**

```ts
// Before
findAll()
findById(id)

// After
findAllByUserId(userId: string)
findByIdForUser(id: string, userId: string) // null if wrong tenant
create(data & { userId }, opts)
```

Stamp `userId` on every insert. Portfolio entry create includes `userId`.

- [ ] **Step 2: Fix all TypeScript call sites in api package** (compiles with errors → fix until `vp check` in db+api clean).

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(db): scope repositories by userId"
```

---

### Task 8: API routers — pass session.user.id

**Files:**

- All protected routers under `packages/api/src/routers/`
- Especially `portfolio.router.ts`, `resume.router.ts` (`fetchPortfolioData`), `contact.router.ts`, `onboarding.router.ts`, `profile.router.ts`

- [ ] **Step 1: Grep and eliminate site-owner oracles**

```bash
rg "findFirst\\(|findAll\\(\\)|admin user|REGISTRATION_CLOSED" packages/api packages/db/src/repositories --type ts
```

Replace every `userRepository.findFirst()` used as “the portfolio owner” with `context.session.user.id` (protected) or resolved public userId (public). Known hotspots: `portfolio.router.ts`, `resume.router.ts`, `contact.router.ts`.

- [ ] **Step 2: Every protected handler**

```ts
const userId = context.session.user.id;
// pass to repository
```

- [ ] **Step 3: get-by-id wrong tenant → null → ORPC NOT_FOUND (not FORBIDDEN)**

- [ ] **Step 4: Public portfolio list/get** — will take `profileName` or resolved userId in Phase C; temporarily may still break public site until Phase C — acceptable if dashboard works for the session user.

- [ ] **Step 5: `vp check` in packages/api**

- [ ] **Step 6: Commit**

```bash
git commit -m "fix(api): tenant-scope all protected domain routers"
```

---

### Task 9: Resume author language (optional same PR)

- [ ] Prefer rename enum `admin` → `user` if migration is safe; else map in mappers and stop using “admin” in UI copy.
- [ ] Commit if changed.

---

## Phase C — Public portfolio by profileName

### Task 10: resolvePublicPortfolioUser by profileName

**Files:**

- Create: `packages/api/src/lib/public-portfolio/resolve-context.ts`
- Create: `packages/db` helper `userRepository.findByProfileName` + alias resolve

```ts
export async function resolveUserIdByProfileName(profileName: string): Promise<string | null> {
  const normalized = normalizeProfileName(profileName);
  if (isReservedProfilePath(normalized)) return null;
  const byName = await userRepository.findByProfileName(normalized);
  if (byName) return byName.id;
  const alias = await profileSlugAliasRepository.findBySlug(normalized);
  return alias?.userId ?? null;
}
```

- [ ] **Step 1: Implement + unit-test pure reserved check (core already tested)**
- [ ] **Step 2: Public portfolio procedures** accept `profileName: string`, resolve userId, 404 if null
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): resolve public portfolio by profileName"
```

---

### Task 11: Web routes — `/$profileName` public site

**Files:**

- Create: `apps/web/src/routes/(root-layout)/$profileName/index.tsx` (and nested routes as needed to mirror current home sections)
- Modify: `apps/web/src/routes/(root-layout)/index.tsx` → community landing (OSS pitch + sign-in + self-host CTA) — **not** a pricing page
- Refactor: `HomePage` to accept `profileName` or public user id from loader

- [ ] **Step 1: Route `beforeLoad`**

```ts
// Reject reserved names → notFound()
// Prefetch public portfolio for profileName
```

- [ ] **Step 2: Move current portfolio home content under `$profileName`** (or shared component used by both once custom domain root exists).

- [ ] **Step 3: Primary `/`** becomes community landing.

- [ ] **Step 4: SEO** — per-profile `head()` (title/description from that user’s profile). Shared helper `getPublicPortfolioBaseUrl({ profileName, customDomainHostname? })` returns path URL for now; Phase D extends it for verified domains.

- [ ] **Step 5: Sitemap** — emit `/{profileName}` URLs for users with portfolio entries (or all public profiles).

- [ ] **Step 6: Manual** — visit `/{yourProfileName}` sees your portfolio; `/dashboard` still works.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(web): public portfolio routes by profileName"
```

---

## Phase D — Custom domains

### Task 12: DB + core — user_custom_domain

**Files:**

- Create: `packages/db/src/schema/user-custom-domain.schema.ts`
- Create: `packages/core/src/domain/types.ts`, `utils.ts` (hostname normalize)
- Create: `packages/db/src/repositories/user-custom-domain.repository.ts`
- Migration

```ts
// hostname unique, userId FK, status pending|verified|failed,
// verificationToken, verifiedAt, timestamps
```

Hostname normalize: lowercase, strip trailing `.`, reject empty, reject if equals primary app host.

**v1 policy:** at most **one** domain row per user (repository `upsertForUser` replaces pending/verified row). Global unique on `hostname`.

- [ ] **Step 1–4:** schema, core normalize tests, repo upsert, migrate, commit

```bash
git commit -m "feat(db): user_custom_domain table"
```

---

### Task 13: API — domain router + Host resolution

**Files:**

- Create: `packages/api/src/routers/domain.router.ts`
- Modify: `resolve-context.ts` to check Host first
- DNS verify: use Node `dns.promises` Resolver for TXT (or CNAME)

```ts
// domain.get — current user's domain row
// domain.set({ hostname }) — upsert pending + new token
// domain.verify — lookup DNS, set verified
// domain.remove
```

- [ ] **Step 1: Implement verify** — TXT record value must equal `verificationToken` at host or `_career-verify.{hostname}` (pick one; document in UI).

- [ ] **Step 2: resolvePublicPortfolioContext({ host, path })**

Order per spec:

1. verified custom domain → userId, mode `custom_domain`
2. profileName path → userId, mode `path`
3. else null / landing

- [ ] **Step 3: Public procedures use Host from request context** — ensure oRPC/Hono context exposes `host` header (trust proxy config documented).

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(api): custom domain verify and Host routing"
```

---

### Task 14: Web — Domain settings + custom domain root portfolio

**Files:**

- Create: `apps/web/src/features/domain/*`
- Create: settings Domain UI
- Modify: root layout / index loader — if request Host is verified custom domain, render portfolio at `/` instead of community landing
- Redirect `/dashboard` on custom domain Host → primary `VITE_WEB_URL/dashboard`

- [ ] **Step 1: Settings → Domain** — input, DNS instructions, status, Verify, Remove. Show path URL + custom URL.

- [ ] **Step 2: SSR/host detection** — use request host in route loaders (TanStack Start server context).

- [ ] **Step 3: Docs snippet** in README: DNS + TLS is operator; then Verify in app.

- [ ] **Step 4: Manual dogfood** — hosts file or local header test: map fake host → portfolio.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): domain settings and Host-based public portfolio"
```

---

## Phase E — Agents, docs, hardening

### Task 15: Agents + storage stamp userId

**Files:**

- Mastra workflows / agent hub tools that load portfolio
- Resume generate path

- [ ] Ensure every agent/workflow input includes `userId` from session; never `findFirst` owner.
- [ ] AI missing keys: clear error, CRUD still works (document BYO).
- [ ] Commit: `fix(agent): scope portfolio tools by userId`

---

### Task 16: CONTEXT.md + README + env + agent docs

- [ ] Glossary in `CONTEXT.md`: profile name, slug alias, invite, custom domain, primary app host, tenant `userId`, BYO AI/Resend, TLS not app concern.
- [ ] README: free OSS intention; no SaaS billing; self-host; custom domain + **operator TLS** note (app does not issue certs).
- [ ] `packages/env/.env.example`: optional `PUBLIC_APP_HOST` for CNAME instructions; document BYO AI / `RESEND_API_KEY`.
- [ ] Grep purge in code + `.agents/*`: `REGISTRATION_CLOSED`, `findFirst` as owner, “admin user” for portfolio, single-owner assumptions.
- [ ] Commit: `docs: multi-user tenancy glossary and OSS posture`

---

### Task 17: End-to-end verification checklist

Run through spec testing checklist (invite isolation, IDOR 404, stack name collision OK, rename alias, custom domain pending vs verified, dashboard redirect policy, AI/Resend without keys).

- [ ] Fix any gaps found.
- [ ] Final commit if needed.

---

## Validation commands (throughout)

```bash
# After package work
cd packages/core && vp check
cd packages/db && vp check
cd packages/api && vp check
cd apps/web && vp check

# Migrations — never against production without explicit user OK
vp run db:generate
vp run db:migrate

# Broad (before handoff)
vp run -w fix
```

---

## Risk notes for implementers

1. **Auth schema is generated** — profileName only via Better Auth config + `auth:generate`.
2. **Migration backfill** must run before NOT NULL; sole existing user owns all current rows.
3. **Public home move** is the highest UX breakage risk — ship path portfolios before flipping `/` to landing, or same PR with care.
4. **OAuth signup + profileName** — decide temporary slug strategy early (Task 3).
5. **Trusted Host header** — document reverse proxy; do not trust arbitrary `X-Forwarded-Host` in production without config.
6. **Do not implement TLS/ACME** in app.
7. **Do not implement Seeker CRM** in this plan.

---

## Execution handoff

After this plan is approved:

1. **Subagent-driven (recommended)** — one task per subagent, review between tasks (`superpowers:subagent-driven-development`)
2. **Inline** — execute in session with checkpoints (`superpowers:executing-plans`)

Start at **Task 1**. Do not skip Phase B before public multi-user claims security.
