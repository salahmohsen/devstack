# Super admin console — design

**Date:** 2026-08-22  
**Status:** Locked for implementation on `feat/super-admin` (isolated from `feat/hub-job-context`). User asked to plan and implement without a wait gate.  
**Goal:** Platform operator control of users, invites, and signup access. Super admin is a **platform role**, not a tenant of other people’s portfolios.

**Related**

- [Auth patterns](../../../.agents/auth.md)
- [End-to-end feature workflow](../../../.agents/end-to-end-features.md)
- [UI guidelines](../../../.agents/ui.md) — `SurfaceIslandLayout` for Settings-style islands
- Better Auth admin plugin: https://www.better-auth.com/docs/plugins/admin
- Product glossary: [CONTEXT.md](../../../CONTEXT.md)

**Not this spec:** writing code (plan next). Hub tools for admin. Tenant hard-delete / wipe. Billing. Audit-log table. Global job-pantry operator UI. Making admin the owner of other tenants’ evidence.

---

## Glossary

**Super admin.** Platform operator. Better Auth `user.role = "admin"`. UI label is **Super admin**. Can list every user, manage invites, set signup mode, ban, impersonate, and promote/demote. Does **not** own another tenant’s `userId` rows. Impersonation is the only way to act _as_ that tenant.

**Member.** Default role `user`. Each member is a tenant (`userId` on domain rows). Settings stay personal (profile, AI keys, jobs prefs). Members cannot create app invites.

**Signup mode.** Platform singleton: `invite_only` (default) or `open`. First user on an empty database still bootstraps with no invite and becomes super admin.

**Named invite link.** Reusable (or capped) signup URL with a human `name` (e.g. “Twitter Q3”). Many users can redeem one link. Each redemption is stored.

**Email invite.** Single-use code emailed to one address. Still has a name (defaults to the email).

**Invite attribution.** The invite (name + code) a user signed up with. Shown on the users table and on the invite’s signup list. Bootstrap and open-registration users have none.

**Ban.** Operator disable. User cannot sign in; sessions revoked. Tenant data stays. Safer than delete.

---

## Product lock

DevHub is multi-tenant. Super admin is the **operator of the installation**, not a second portfolio owner.

- Invites leave **Settings → Workspace**. They live only under **Dashboard → Admin**.
- Admin is a dedicated island (`/dashboard/admin/*`), same chrome as Settings (`SurfaceIslandLayout`). It is **not** mixed into personal Settings.
- Sidebar **Admin** item is visible only when `role === "admin"` and the session is not impersonating.
- Open registration is an operator toggle, not a permanent product default. Glossary still prefers invite-gated installs.
- Super admin never reads another tenant’s BYO AI keys, Gmail tokens, or GitHub tokens in this console.

---

## What we already have

- Invite-gated signup after first user (`packages/auth/src/auth.ts` `user.create` hooks). Codes via body / `tsu_invite_code` cookie / OAuth state.
- `invite` table: code, createdBy, usedBy, email, expiresAt, usedAt. **No name. Single-use only. Any signed-in user can create.**
- Settings → Invites UI (`invite-settings.tsx`) + `invite` oRPC router (`protectedProcedure`).
- Better Auth user: name, email, emailVerified, image, username, phone, summary, onboardingCompletedAt. **No role, no ban.**
- Sign-in already maps `REGISTRATION_CLOSED` / `INVITE_REQUIRED` / `INVITE_INVALID`.
- Dashboard island pattern: Settings, Mail. List + inspect for entities.
- tsu-stack template has **no** invite product and **no** admin plugin. This is a DevHub product layer.

Gaps: no platform role, no users table, no named/multi-use links, no signup attribution in UI, no open vs invite-only toggle, invites sit in personal Settings.

---

## Locked decisions

| #   | Topic             | Decision                                                                                                                                                                     |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Role storage      | Better Auth **admin plugin**. `defaultRole: "user"`, `adminRoles: ["admin"]`. UI says Super admin.                                                                           |
| 2   | First user        | Empty DB bootstrap still skips invite. `user.create.before` sets `role: "admin"`. Existing DBs: migration backfills the **oldest** user as admin if none exist.              |
| 3   | Admin UI          | `/dashboard/admin` island. Nav: **Users**, **Invites**, **Access**. Sidebar item only for super admin.                                                                       |
| 4   | Invites           | Operator-only. Named links (optional `maxUses`, null = unlimited until revoked) + email single-use. Soft revoke (`revokedAt`). Redemptions table for attribution.            |
| 5   | Signup mode       | `platform_setting` singleton. `invite_only` (default) or `open`. Open: invite optional, still attributed if present. Invite-only: required after first user.                 |
| 6   | Users table       | Dense table + row inspect sheet. All safe user fields. Invite name/code. Last session. Linked providers (ids only). Tenant **counts**, not payloads.                         |
| 7   | User control      | Ban / unban, set role, revoke all sessions, impersonate (BA client). **No tenant hard-delete in v1.**                                                                        |
| 8   | Last super admin  | Cannot demote, ban, or impersonate-into-a-state that leaves zero admins. Cannot ban self.                                                                                    |
| 9   | Impersonate       | Better Auth `adminClient().impersonateUser`. Banner “Viewing as {name} — Stop”. Admin nav hidden while impersonating.                                                        |
| 10  | API split         | oRPC `admin.*` for list/joins/settings/invites/ban/role/sessions. Impersonate via `authClient.admin` (cookie Set-Cookie). Public `signupPolicy.get` for create-account copy. |
| 11  | Old invite router | `invite.*` procedures become `admin.invites.*`. Settings route redirects to `/dashboard/admin/invites`.                                                                      |
| 12  | Tenancy           | Unchanged. Super admin listing users is the **only** unscoped user read. Domain tables stay `userId`-scoped. Impersonation is how the operator enters a tenant dashboard.    |

---

## UX (current dashboard)

Best fit: **Settings-shaped island**, not a buried Settings tab and not a separate app.

```
Dashboard sidebar
  … Mail
  Settings
  Admin          ← only if super admin and not impersonating

/dashboard/admin
  island: Users | Invites | Access
  pane:   table / form for the active section
```

**Users**

- Search box (`q` on name, email, username).
- Table columns: person (avatar, name, username), email + verified, role, status (Active / Banned), invite (name or —), created, last seen.
- Row click opens an inspect sheet (same family as item inspect / `SettingsFrame` density): all user fields, invite attribution, linked providers (`github` / `google` / `credential` — no tokens), session count, counts (experiences, projects, skills, applications, mail messages), custom domain hostname if any.
- Row menu: Impersonate, Ban / Unban, Make super admin / Make member, Revoke sessions.
- Confirm dialogs for ban, demote, impersonate, revoke sessions.

**Invites**

- **Name a link** form: name (required), optional max uses, optional expiry → Create link → copy URL.
- **Email** form: existing tags field + optional shared name (default each email).
- Table: name, kind (Link / Email), uses (`3` or `3 / 10`), status (Open / Exhausted / Revoked / Expired), created, last used.
- Expand or sheet: people who signed up (link to Users filtered by `inviteId`).
- Revoke unused capacity (sets `revokedAt`; history stays).

**Access**

- Segmented control: **Invite only** vs **Open registration**.
- Short copy: Invite only = new accounts need a valid named link or email invite after the first user. Open = anyone can create an account; an invite still attributes them.
- Stat row: users, banned, open invites.

**Signup page**

- `signupPolicy.get` drives copy. Open: no “ask for an invite”. Invite-only without `?invite=`: keep current closed copy. With invite: “You’ve been invited”.

**Impersonation banner**

- Fixed bar under the topbar while `session.impersonatedBy` is set. Stop calls `authClient.admin.stopImpersonating()` and returns to `/dashboard/admin/users`.

---

## Data

### Better Auth (via `auth:generate`)

User: `role` (text, default `user`, `input: false`), `banned` (bool), `banReason`, `banExpires`.  
Session: `impersonatedBy`.

Do not hand-edit `auth.schema.ts`. Add `admin()` plugin, run `vp run --filter @tsu-stack/db auth:generate`, re-apply existing hand fixes (`username` `.notNull()`, `onboardingCompletedAt` timezone) per [Auth patterns](../../../.agents/auth.md).

Migration SQL also: `UPDATE "user" SET role = 'admin' WHERE id = (oldest) AND no admin exists`.

### `invite` (extend)

| Column                        | Meaning                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `name`                        | Operator label. Required for new links. Email invites default to the address.  |
| `max_uses`                    | `1` for email. Integer ≥ 1 for capped links. `null` = unlimited until revoked. |
| `use_count`                   | Redemption count.                                                              |
| `revoked_at`                  | Soft revoke.                                                                   |
| `used_at` / `used_by_user_id` | Keep as **last** redemption / exhausted marker for max=1 compatibility.        |

`findValidByCode`: not revoked, not expired, and (`max_uses` is null **or** `use_count < max_uses`).

### `invite_redemption` (new)

`id`, `invite_id` (cascade), `user_id` (set null), `used_at`. Unique `(invite_id, user_id)`. Unique `user_id` (one attribution per user).

Signup `after` hook: insert redemption, increment `use_count`, set last used columns; if capped and full, that is exhaustion (no extra `used_at` gate beyond count).

### `platform_setting` (new, singleton)

`id` PK default `'default'`, `signup_mode` (`invite_only` \| `open`, default `invite_only`), `updated_at`, `updated_by_user_id`.

---

## Auth hook changes

`user.create.before` (non-bootstrap):

1. Read `platform_setting.signup_mode` (default invite_only).
2. If `invite_only`: current invite required / valid checks.
3. If `open`: invite optional; if present must still be valid (do not silently ignore a bad `?invite=`).
4. Bootstrap: set `role: "admin"` on the returned data.

`user.create.after`:

- Bootstrap: clear cookie, return (already admin).
- If invite code present: consume (redemption). Fail closed only when **invite_only** and consume fails (delete user). Open mode with no invite: ok.

Banned users: BA admin plugin blocks sign-in once `banned` is true.

---

## API

`superAdminProcedure` = `protectedProcedure` + role `admin` + not banned. If cookie-cached session lacks `role`, look up `user.role` (fail closed).

```
admin.users.list        { q?, limit, offset } → { items, total }
admin.users.get         { id } → detail (fields + invite + providers + counts + domain)
admin.users.setRole     { userId, role: admin|user }
admin.users.ban         { userId, reason? }
admin.users.unban       { userId }
admin.users.revokeSessions { userId }

admin.invites.list
admin.invites.createLink   { name, maxUses?, expiresAt? }
admin.invites.sendEmails   { emails, name?, expiresAt? }
admin.invites.revoke       { id }
admin.invites.signups      { inviteId } → users

admin.access.get
admin.access.setSignupMode { signupMode }

signupPolicy.get        public → { signupMode, inviteRequired }
```

Errors: `FORBIDDEN`, `USER_NOT_FOUND`, `LAST_ADMIN`, `CANNOT_BAN_SELF`, `INVITE_NOT_FOUND`.

**List item fields (safe):** id, name, email, emailVerified, image, username, displayUsername, phone, summary (truncated in table, full in sheet), onboardingCompletedAt, role, banned, banReason, banExpires, createdAt, updatedAt, lastSeenAt, sessionCount, invite `{ id, name, code, kind } | null`.

Do **not** return: password hashes, OAuth tokens, AI ciphertext, mail bodies.

---

## Web

- `apps/web/src/pages/dashboard/admin/` — layout + Users / Invites / Access pages.
- `apps/web/src/features/admin/api/` — query/mutation wrappers.
- Routes under `__protected/dashboard/admin/{users,invites,access}/`.
- `beforeLoad`: session role !== admin → redirect `/dashboard`.
- Remove Invites from `settings-layout.tsx`. Keep `/dashboard/settings/invites` as redirect.
- Sidebar: Admin after Settings when `user.role === "admin"` and `!session.impersonatedBy`.
- `authClient` plugins: add `adminClient()`.
- Create-account / sign-in copy from `signupPolicy.get`.

---

## Docs to update (same change)

- `CONTEXT.md` — Invite (named links + attribution); add Super admin; drop “avoid open registration” as a hard avoid (it is now an operator toggle). Keep “avoid admin as sole portfolio owner”.
- `.agents/auth.md` — admin plugin, `auth:generate`, signup mode, superAdminProcedure.
- `AGENTS.md` topic index — link this spec.
- `README.md` — Admin route; invites moved.

---

## Out of scope (explicit)

- Deleting a tenant and cascading evidence.
- Reading/decrypting BYO keys or mailbox contents from Admin.
- Admin hub-chat tools.
- Custom access-control roles beyond `admin` / `user`.
- Durable `admin_audit_event` table (handlers may `logger.emit` on ban/role/signup-mode; no new table).
- Billing, feature flags per tenant, job-pantry global editor.

---

## Success

1. First user (or oldest existing) is Super admin. Members never see Admin or Settings → Invites.
2. Super admin can name a link, copy it, and see who signed up with it on both Invites and Users.
3. Access toggle Open vs Invite only changes whether `?invite=` is required after the first user.
4. Ban stops sign-in. Impersonate opens that tenant’s dashboard with a Stop banner. Last super admin cannot be demoted or banned.
5. Tenant isolation holds: listing users is platform-scoped; all career data stays `userId`-scoped unless impersonating.
