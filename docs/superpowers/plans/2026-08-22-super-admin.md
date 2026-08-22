# Super Admin Console Implementation Plan

> **For agentic workers:** Implement task-by-task in the `feat/super-admin` worktree. Repo testing policy: do not add a test suite unless a task already has tests to extend. Validate with `vp check` / `vp run -w fix`.

**Goal:** Platform super-admin island with a users table, named invite links + signup attribution, and an open vs invite-only signup toggle.

**Architecture:** Better Auth `admin()` plugin owns `role` / ban / impersonate schema. oRPC `admin.*` is the dashboard API (joins, invites, access). `platform_setting` singleton stores signup mode. Invites gain name/capacity + `invite_redemption`. UI is `/dashboard/admin` using `SurfaceIslandLayout`, matching Settings.

**Tech Stack:** TanStack Start, Hono, oRPC, Drizzle, Better Auth admin plugin, existing `@tsu-stack/ui` Table / Frame / ConfirmDialog.

**Spec:** `docs/superpowers/specs/2026-08-22-super-admin-design.md`

**Worktree:** `/Users/salah/Developer/personal-hub/.worktrees/feat-super-admin` on branch `feat/super-admin`.

---

## File map

**Create**

- `packages/core/src/admin/` — roles, signup mode, user list/detail schemas
- `packages/core/src/invite/` — extend types (name, maxUses, useCount, revokedAt, kind, signups)
- `packages/db/src/schema/platform-setting.schema.ts`
- `packages/db/src/schema/invite-redemption.schema.ts`
- `packages/db/src/repositories/platform-setting.repository.ts`
- `packages/api/src/routers/admin.router.ts` (or `routers/admin/index.ts` + queries)
- `apps/web/src/pages/dashboard/admin/` — layout + users/invites/access UI
- `apps/web/src/features/admin/api/` — query/mutation wrappers
- `apps/web/src/routes/(root-layout)/__protected/dashboard/admin/` — route tree
- `apps/web/src/widgets/layout/ui/impersonation-banner.tsx`

**Modify**

- `packages/auth/src/auth.ts` — `admin()` plugin, bootstrap role, signup mode gate, redemption consume
- `packages/auth/src/react/auth-client.ts` — `adminClient()`
- `packages/db/src/schema/auth.schema.ts` — via `auth:generate` (do not hand-author plugin columns)
- `packages/db/src/schema/invite.schema.ts` — name, maxUses, useCount, revokedAt
- `packages/db/src/repositories/invite.repository.ts` — valid-by-code, consume, listAll, revoke soft
- `packages/db/src/repositories/user.repository.ts` — list/search, count by role, lastSeen join
- `packages/api/src/lib/procedures/factory.ts` — `superAdminProcedure`
- `packages/api/src/routers/index.ts` — `admin` + `signupPolicy`; remove tenant `invite` router
- `packages/core/src/index.ts` — export admin
- `packages/core/src/orpc-context/index.ts` — session user `role?`
- Settings layout, sidebar, create-account/sign-in copy
- `CONTEXT.md`, `.agents/auth.md`, `AGENTS.md`, `README.md`

---

### Task 1: Core contracts

**Files:**

- Create: `packages/core/src/admin/types.ts`, `constants.ts`, `index.ts`
- Modify: `packages/core/src/invite/types.ts`, `packages/core/src/index.ts`

- [ ] **UserRoleSchema** = `z.enum(["admin", "user"])`. `SUPER_ADMIN_ROLE = "admin"`. UI label helper `formatUserRole`.
- [ ] **SignupModeSchema** = `z.enum(["invite_only", "open"])`. Default `invite_only`.
- [ ] **AdminUserListItemSchema** — id, name, email, emailVerified, image, username, displayUsername, phone, summary, onboardingCompletedAt, role, banned, banReason, banExpires, createdAt, updatedAt, lastSeenAt, sessionCount, invite `{ id, name, code, kind } | null`.
- [ ] **AdminUserDetailSchema** extends list item with providers `z.array(z.object({ providerId: z.string() }))`, counts `{ experiences, projects, stacks, applications, mailMessages }`, customDomain `string | null`.
- [ ] **InviteKindSchema** = `z.enum(["link", "email"])`.
- [ ] Extend **InviteOutputSchema** with name, maxUses, useCount, revokedAt, kind (derived: email set → email else link).
- [ ] **CreateNamedInviteLinkInputSchema** `{ name: z.string().trim().min(1).max(80), maxUses: z.number().int().min(1).nullable().optional(), expiresAt: z.coerce.date().nullable().optional() }`.
- [ ] **SendInviteEmailsInputSchema** add optional `name`.
- [ ] **SignupPolicyOutputSchema** `{ signupMode, inviteRequired: boolean }`.
- [ ] Export from `packages/core/src/index.ts`.

- [ ] Commit: `feat(core): add super-admin and named-invite contracts`

---

### Task 2: Auth plugin + generate schema

**Files:** `packages/auth/src/auth.ts`, `packages/auth/src/react/auth-client.ts`, `packages/db/src/schema/auth.schema.ts`

- [ ] Import `admin` from `better-auth/plugins`. Add to plugins array:

```ts
admin({
  defaultRole: "user",
  adminRoles: ["admin"]
});
```

- [ ] Client: `adminClient()` from `better-auth/client/plugins`.
- [ ] In `user.create.before` bootstrap branch, set `role: "admin"` on returned data.
- [ ] Run from worktree: `vp run --filter @tsu-stack/db auth:generate`.
- [ ] Re-apply hand fixes if the generator drops them: `username` `.notNull()`, `onboardingCompletedAt` `withTimezone: true`. Keep generated `role`, `banned`, `banReason`, `banExpires`, `session.impersonatedBy`.
- [ ] Commit: `feat(auth): enable Better Auth admin plugin`

---

### Task 3: Invite + platform_setting schema and repos

**Files:** invite schema, invite-redemption, platform-setting, repositories, relations, schema/index, types

- [ ] Extend `invite` with `name` text, `maxUses` integer, `useCount` integer not null default 0, `revokedAt` timestamptz.
- [ ] `invite_redemption` as spec.
- [ ] `platform_setting` singleton as spec.
- [ ] Repos:
  - `platformSettingRepository.get()` / `setSignupMode(mode, userId)` — upsert id=`default`.
  - `inviteRepository.findValidByCode` — not revoked, not expired, capacity remaining.
  - `inviteRepository.consume(id, userId)` — insert redemption (ignore unique race), increment useCount, set usedAt/usedByUserId; return false if no longer valid.
  - `listAll()` for admin (not listByCreator).
  - `revoke(id)` soft: set revokedAt where revokedAt is null (allow revoking remaining capacity even if some uses exist).
  - `listSignups(inviteId)`, `findAttributionByUserId(userId)`.
  - `userRepository.listForAdmin({ q, limit, offset })` with last session max(created/updated), session count, invite join via redemption.
  - `countByRole("admin")`.
- [ ] Relations for invite ↔ redemptions ↔ user; platformSetting.updatedBy.
- [ ] **Check `packages/env/.env` DATABASE_URL is local Docker, not production.** Then `vp run db:generate` and `vp run db:migrate`.
- [ ] Custom SQL in the generated migration (or a follow-up statement): backfill oldest user `role = 'admin'` if no admin exists; set existing invites `use_count = 1` where `used_at` is not null, `max_uses = 1` for email invites, `max_uses = 1` for used links, `max_uses` null for unused link-only rows (legacy unused links become unlimited? **No** — legacy unused stay `max_uses = 1` to preserve single-use behavior). Insert redemptions from existing usedByUserId.
- [ ] Insert `platform_setting` default row.
- [ ] Commit: `feat(db): named invites, redemptions, signup mode, admin backfill`

---

### Task 4: Signup hook uses signup mode + redemptions

**Files:** `packages/auth/src/auth.ts`

- [ ] Non-bootstrap `before`: load signup mode. Invite-only → require valid invite. Open → if invite present, must be valid; if absent, continue. Bootstrap → `role: "admin"`.
- [ ] `after`: bootstrap clear cookie. If invite code: `consume`; on failure and invite-only (or a code was supplied): delete user + INVITE_INVALID. Open + no code: ok.
- [ ] Throw `REGISTRATION_CLOSED` only if we introduce a third mode later — **do not**. Invite-only without code stays `INVITE_REQUIRED`.
- [ ] Commit: `feat(auth): honor signup mode and named invite redemptions`

---

### Task 5: superAdminProcedure + admin + signupPolicy routers

**Files:** factory.ts, admin router, index.ts, delete or stub invite.router.ts

- [ ] `superAdminProcedure`: session required; resolve role from `session.user.role` or `userRepository.findById`; reject if not `admin` or `banned`.
- [ ] Implement all spec procedures. Ban: set banned + banReason + delete sessions for that userId. Unban: clear banned fields. setRole: refuse if target is last admin being demoted. ban: refuse self and last admin. revokeSessions: delete session rows for userId (not current admin’s own unless targeting another user).
- [ ] `signupPolicy.get` public: `{ signupMode, inviteRequired: mode === "invite_only" && userCount > 0 }`.
- [ ] Remove `invite` from `appRouter`. Point web at `admin.invites.*`.
- [ ] Durable `logger.emit` on ban, unban, setRole, setSignupMode only (security).
- [ ] Widen `OrpcContextSession` user with optional `role`, `banned`; session optional `impersonatedBy`.
- [ ] Commit: `feat(api): super-admin procedures for users, invites, access`

---

### Task 6: Web admin island

**Files:** pages, features/admin, routes, sidebar, settings-layout, impersonation banner, auth forms

- [ ] Routes: `/dashboard/admin` redirects to `/dashboard/admin/users`. Island layout cloned from Settings (Users / Invites / Access). `beforeLoad` redirect non-admin to `/dashboard`.
- [ ] Users page: table + search + inspect sheet + menus + ConfirmDialog.
- [ ] Invites page: named link form, email form, table, copy link, revoke, signups sheet.
- [ ] Access page: signup mode control + stats.
- [ ] Sidebar Admin item (Shield icon or similar) when `user.role === "admin"` and not impersonating. MatchPrefix `/dashboard/admin`.
- [ ] Impersonation: `authClient.admin.impersonateUser({ userId })` then `window.location.assign("/dashboard")`. Banner in dashboard layout when `authClient.useSession().data?.session?.impersonatedBy`. Stop → `stopImpersonating` → `/dashboard/admin/users`.
- [ ] Remove Invites from settings nav. `/dashboard/settings/invites` redirects to `/dashboard/admin/invites`.
- [ ] Create-account copy from `signupPolicy.get`.
- [ ] Reuse `SettingsFrame` / Table / Badge / CopyButton / ConfirmDialog / PromptDialog. No new packages/ui primitives unless missing.
- [ ] Commit: `feat(web): super-admin island, users table, named invites, access`

---

### Task 7: Docs

- [ ] CONTEXT.md, .agents/auth.md, AGENTS.md, README.md as spec “Docs to update”.
- [ ] Commit: `docs: super-admin glossary and auth patterns`

---

### Task 8: Validate

- [ ] `vp run -w fix` from worktree.
- [ ] react-doctor on new/changed web files.
- [ ] If `pnpm run dev` is up, browser-check `/dashboard/admin` as the first user: users table, create named link, Access toggle. If the worktree has no running app, say so.
- [ ] Do not claim CI green if GitHub billing is still failing.

---

## Execution

Implement inline in this session (user asked not to wait). Keep commits conventional. Stay on `feat/super-admin`; do not merge to `feat/hub-job-context`.
