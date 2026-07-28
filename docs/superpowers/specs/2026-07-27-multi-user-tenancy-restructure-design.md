# Multi-User Tenancy Restructure

**Date:** 2026-07-27  
**Updated:** 2026-07-27 (custom domains in plan; free OSS / community; no SaaS business)  
**Status:** **Implemented** on `feat/multi-user-tenancy` (Phases A–E). Historical “current state / single-owner” sections below describe the pre-restructure app for context. Seeker CRM and marketplace remain out of scope.  
**Goal:** Convert the single-portfolio app into a multi-user, invite-gated, open-source career OS foundation with public profiles at `/{profileName}/…` **and** optional **custom domains** (dashboard domain settings → Host routes to that user’s portfolio at `/`), without shipping Seeker CRM, marketplace, billing, or outbound apply mail in this epic.

---

## Product intention (north star)

> Ship an **open-source, self-hostable career OS** the maintainer uses to get hired — free for everyone, **bring your own AI and mail keys**, no paywalls — portfolio evidence and (later) applications in one place. Serve the community; do **not** build a SaaS company yet.

Inspired by products like [Reactive Resume](https://rxresu.me/) (free forever, MIT-class OSS, first-class self-host, hosted demo without extracting rent) — but **not** a resume-template clone. Differentiation is the **living evidence graph** (profile, experiences, projects, stacks, portfolio gate, generated resumes) and, next, a **job applications CRM**.

| Principle                        | Meaning                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free & open**                  | No Stripe, plans, seats, or feature gates. Optional future: sponsors / donations only — never required to use the software.                         |
| **Self-host first-class**        | Docker / compose; full feature parity with any hosted demo.                                                                                         |
| **BYO AI**                       | Users (or self-host operators) supply their own LLM provider keys (or local Ollama). The project must not assume a platform-paid model budget.      |
| **BYO mail (Resend)**            | Operators set `RESEND_API_KEY` (and domain) for transactional mail they choose to enable. No “we send unlimited apply emails for free on our dime.” |
| **Hosted instance (if any)**     | Best-effort community demo — not a revenue product. Prefer rate limits, invites, and **no server-funded AI** on a public host.                      |
| **Maintainer success metric**    | Land a good job while dogfooding the tool + ship something the community can star and self-host.                                                    |
| **No business plan for now**     | Marketplace, billing, sales, enterprise SSO, and growth-at-all-costs GTM are **out**. Revisit only if intentional later.                            |
| **Personal domain + multi-user** | Maintainer (and any user) can point a **custom domain** at the same multi-user app; Host → their portfolio at `/`. No `SINGLE_USER_MODE`.           |

### What we are building (product shape)

```
Career OS (OSS)
  ├── Public portfolio     →  /{profileName}/…  OR  custom domain Host → /
  ├── Evidence graph       →  experiences, projects, stacks, portfolio_entry
  ├── Resume generation    →  from evidence (BYO AI when agentic)
  ├── Seeker CRM (next)    →  applications + preferences
  └── Integrations         →  BYO AI provider, BYO Resend, GitHub (existing)
```

### What we are not building (for now)

- Monetized multi-tenant SaaS with platform-paid AI
- Employer marketplace / company job boards as a business
- Mass auto-apply / send-as-platform spam
- Org/workspace B2B tenancy
- **`SINGLE_USER_MODE`** (locks registration to one user) — replaced by custom domains

---

## Product decisions (frozen)

| Topic                      | Decision                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Business model**         | **None.** Free OSS + self-host. No payments epic.                                                      |
| **AI cost model**          | **BYO provider keys** (env and/or per-user encrypted keys later). No platform-funded unlimited LLM.    |
| **Mail cost model**        | **BYO Resend** (`RESEND_API_KEY`). Auth/product mail only when operator configures it.                 |
| Tenant model               | User-as-tenant (`userId` on all domain rows). No org/workspace.                                        |
| Public site (path)         | Public by default at `app-host/{{profileName}}/…`                                                      |
| Public site (domain)       | **Custom domain** per user (dashboard settings) → portfolio at `https://their-domain/`                 |
| Private always             | Applications, job prefs, follow-ups, private storage (when added); dashboard stays on primary app host |
| Registration               | Invite-only on multi-user instances (replace first-user-only gate)                                     |
| `profileName`              | Required at signup; renamable; old slug redirects via alias table                                      |
| Mail (this epic)           | Unchanged optional Resend for auth/product mail. No application mail.                                  |
| Marketplace / publish jobs | Out of scope                                                                                           |
| Seeker CRM                 | **Next epic** after this foundation                                                                    |
| Naming                     | `userId` everywhere (not `ownerId` / mixed names)                                                      |
| Distribution               | OSS + self-host **full features**; hosted demo optional/best-effort                                    |
| Personal domain            | **Case B: custom domain + domain settings** (not single-user mode)                                     |
| **TLS / HTTPS**            | **Not the app’s concern.** Operator terminates TLS; app only routes + verifies domain ownership.       |

---

## Current state (problems)

1. **Auth:** `user.create` rejects after the first user (`REGISTRATION_CLOSED`).
2. **Schema:** `experience`, `project`, `stack`, `resume`, `portfolio_entry`, `project_stack_scan`, join tables lack `userId`. Only `contact` and `github_config` are user-scoped.
3. **Uniques:** Global uniques (e.g. `stack.name`) break multi-user.
4. **API:** `protectedProcedure` means “logged in”, not “own these rows”. Repositories use `findAll()` with no tenant filter. Portfolio public path uses `userRepository.findFirst()` / “admin user”.
5. **Public routes:** Home/portfolio is a single site (`/`), not per-profile or per-Host.
6. **Language:** Resume author enum `admin | agent`; copy refers to “admin”.
7. **Storage:** Resume sources already use `{userId}/…`; generated resumes must follow the same rule and be scoped in DB.
8. **Implicit single-product-owner** assumptions conflict with community multi-user + personal custom domains.

---

## Target architecture

```
user (tenant root)
  profileName (unique, public path key)
  profile_slug_alias (old names → userId)
  custom domain(s) (verified Host → userId)   ← domain settings
  invite (codes for registration)

  experience.userId
  project.userId
  stack.userId
  resume.userId
  portfolio_entry.userId
  contact.userId          (already)
  github_config.userId    (already)

Public resolution (in order):
  1. Host matches verified custom domain  → that userId, portfolio at /
  2. Path /:profileName (or alias)        → that userId, portfolio under path
  3. Primary app Host + /                 → community landing (not a random user’s data)

Private:  primary app Host + /dashboard/...  → session.user.id scopes all mutations

AI / mail: operator or user BYO keys — never required platform secrets for core CRUD
```

**Join tables** (`project_stack`, `stack_dependency`): no separate `userId` if parent rows are tenant-scoped and all access goes through parent ownership checks. Prefer ownership checks on parent IDs over denormalizing `userId` onto every join (optional denormalize later for query speed).

---

## BYO AI and BYO Resend (platform policy)

These rules apply across epics (foundation + CRM + agents). Implementation depth can grow; **policy is fixed now**.

### AI

| Rule             | Detail                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Self-host**    | Configure provider via env (e.g. OpenAI-compatible base URL + key, or Ollama). Document in self-host guide.                  |
| **Hosted demo**  | Prefer **AI off** or **user-supplied keys** only. Do not run unbounded agent jobs on maintainer-funded keys for all signups. |
| **Agent/Mastra** | Every run is scoped by `userId`. Fail clearly if no provider configured (`AI_NOT_CONFIGURED`).                               |
| **No paywall**   | Lack of AI must not block portfolio CRUD, public site, or (later) manual application tracking. AI is an enhancement.         |

### Resend / email

| Rule                   | Detail                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Operator**           | `RESEND_API_KEY` optional; if missing, skip send (existing auth pattern may already log-and-skip).      |
| **This epic**          | Auth verification / account mail only when configured.                                                  |
| **Seeker CRM (later)** | Product → user reminders only at first; still BYO Resend. No Resend→employer until explicitly designed. |
| **Self-host**          | User’s domain + their Resend project; same `@tsu-stack/email` package.                                  |

### Cost honesty

Free-forever is only sustainable if **tokens and outbound mail are not subsidized by the project**. Document this in README / self-host docs so contributors do not reintroduce “platform pays for GPT-4 for everyone.”

---

## Custom domains (Case B — in scope)

**Decision:** Multi-user always. Any user can attach a domain in the dashboard. When the browser hits that Host, the public portfolio for that user is served at `/` (no `/{profileName}` prefix required).

This is how the maintainer puts **their portfolio on their domain** while the **same app** still serves other users at `app-host/{profileName}`.

### Mental model

```text
DNS (user’s registrar)          App (this product)
salah.dev  →  app server   →    Host: salah.dev
                                → user with verified customDomain = salah.dev
                                → render that user’s public portfolio at /

app.example.com/salah      →    path profileName = salah
                                → same portfolio (path door)
```

### Data model

Prefer a dedicated table (supports future multi-domain / history) **or** columns on `user` for v1. Recommended:

**Table `user_custom_domain`**

| Column                    | Type                    | Notes                                                                  |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `id`                      | text PK                 |                                                                        |
| `userId`                  | text FK → user, cascade |                                                                        |
| `hostname`                | text                    | Normalized lowercase FQDN, **unique** globally (one domain → one user) |
| `status`                  | enum                    | `pending` \| `verified` \| `failed` (optional)                         |
| `verificationToken`       | text                    | Random token for DNS TXT check                                         |
| `verifiedAt`              | timestamptz nullable    | Set when verify succeeds                                               |
| `createdAt` / `updatedAt` | timestamptz             |                                                                        |

**v1 policy:** one active domain per user is enough (UI can still be “Domain” singular). Schema may allow multiple rows later; enforce “at most one verified” or “at most one row” in app if desired.

Normalize hostnames: lowercase, strip trailing dot, reject ports/paths, reject IP literals if you want DNS-only.

### Verification

1. User enters domain in **Settings → Domain** (e.g. `salah.dev` or `www.salah.dev`).
2. App creates/updates row with `status=pending` and a `verificationToken`.
3. UI shows instructions, e.g.:
   - **TXT** at `_career-verify.salah.dev` (or root) = `token`, **or**
   - **CNAME** `salah.dev` / `www` → primary app host (document the exact target from env `VITE_WEB_URL` / `PUBLIC_APP_HOST`).
4. User clicks **Verify** → server performs DNS lookup → on success set `verifiedAt`, `status=verified`.
5. Optional: periodic re-check; if DNS breaks, mark `failed` but do not free the hostname until user removes it (or allow reclaim after grace — keep simple for v1: manual remove only).

Reject claiming hostnames that equal the **primary app host** (the community install hostname).

### Public request resolution

Central helper, e.g. `resolvePublicPortfolioContext(request)`:

```text
host = normalize(request.Host)   // strip port
path = request path

if host is a verified custom domain for user U:
  publicUserId = U
  urlMode = "custom_domain"      // portfolio at /, no profileName prefix
  if path starts with /{U.profileName} or alias:
    optional 301 → same path without profileName prefix
else if path matches /:profileName (not reserved):
  publicUserId = resolve profileName | alias
  urlMode = "path"
else if host is primary app host and path is /:
  community landing
else:
  404
```

**Reserved paths** on both primary host and custom domains: `/dashboard`, `/sign-in`, `/api`, … never treated as portfolio sections that collide. On a **custom domain**, prefer:

- `/` and public portfolio sections = public site
- `/dashboard` and auth = either redirect to primary app host (recommended) or serve app on same host if cookies/`VITE_WEB_URL` allow

**Recommendation:** custom domain is **public portfolio only**; dashboard/sign-in always on **primary app origin** so cookies and OAuth redirect URIs stay simple. Settings shows: “Public site: https://salah.dev · App: https://app.example.com/dashboard”.

### Dashboard: Domain settings

**Location:** Settings → **Domain** (or Profile section “Custom domain”).

| UI                   | Behavior                                              |
| -------------------- | ----------------------------------------------------- |
| Show path URL        | Always: `https://{primaryHost}/{profileName}`         |
| Domain input         | Add / replace domain                                  |
| DNS instructions     | Copy-paste records + target                           |
| Status badge         | Pending / Verified / Failed                           |
| Verify button        | Triggers DNS check                                    |
| Remove domain        | Clears mapping; Host no longer serves portfolio       |
| Canonical public URL | Prefer verified custom domain when set; else path URL |

### SEO / sitemap / links

- Path mode: sitemap entries `https://primary/{profileName}/…`
- Custom domain verified: prefer `https://custom-domain/…` as canonical; optional redirect from path URL to custom domain (later; not required v1)
- `head()` title/description from that user’s profile

### TLS / HTTPS — not our concern (frozen)

**Decision:** TLS/HTTPS/certificates are **entirely outside the application**. The product never issues, renews, or manages certificates for user domains.

Two separate jobs:

| Job                    | Owner                                                            | What it is                                                  |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| **HTTPS (padlock)**    | Operator’s reverse proxy / Cloudflare / Caddy / hosting platform | Encrypts traffic; presents a cert for the hostname          |
| **Domain → portfolio** | **This app**                                                     | Verifies DNS ownership; routes `Host` to the right `userId` |

```text
Browser ──https://salah.dev──►  [ TLS ends here: Caddy / Cloudflare / Nginx ]
                                         │
                                         ▼
                                   This app (Host routing + portfolio)
```

| Concern                       | Policy                                                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App does**                  | Domain settings UI, DNS verify, Host → user routing, public portfolio                                                                                                             |
| **App does not**              | Let’s Encrypt, cert storage, multi-tenant ACME, forcing HTTPS in app code beyond normal “deploy behind HTTPS” assumptions                                                         |
| **Docs do**                   | Short operator note: “Point DNS at your proxy; terminate TLS there; then Verify in Domain settings.” Optional Caddy/Cloudflare examples — no built-in cert automation             |
| **Self-host maintainer**      | Same as any static site: DNS + proxy cert for `salah.dev`, then verify in dashboard                                                                                               |
| **Community multi-user host** | Path URLs work on the primary host’s existing cert. Custom domains only work when the **operator** has already made that hostname reach the app over HTTPS (or HTTP in local dev) |

**HTTPS for operators (beginner note for README / self-host):**

1. Point domain DNS at your server or Cloudflare.
2. Enable HTTPS on the proxy (Cloudflare proxy, Caddy automatic HTTPS, etc.).
3. Forward requests to the app.
4. In the app: Settings → Domain → add domain → Verify.

Steps 1–3 are generic hosting. Step 4 is the only product feature.

Env for operators:

| Variable                         | Meaning                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `VITE_WEB_URL` / primary app URL | Canonical app origin (dashboard, auth)                     |
| Optional `PUBLIC_APP_HOST`       | Host used in CNAME instructions if different from URL host |

### Security

- Only **verified** domains participate in Host routing (pending never serves).
- Global unique `hostname` prevents two users claiming the same domain.
- Normalize and reject obviously invalid hosts.
- Do not trust `X-Forwarded-Host` unless behind a known proxy config (document trusted proxy).
- IDOR: domain mutations only for `session.user.id`.

### Explicitly rejected: `SINGLE_USER_MODE`

Do **not** implement a mode that blocks a second signup and forces root portfolio for “the only user.” Custom domains give the maintainer a personal domain **without** breaking multi-user on the same instance.

---

## Phase plan

### Phase 0 — Prep (docs + conventions)

- [ ] Add domain glossary terms to `CONTEXT.md`: **profile name**, **slug alias**, **invite**, **tenant scope** (`userId`), **custom domain**, **primary app host**, **BYO AI**, **BYO Resend**.
- [ ] Record reserved path list (shared constant in `packages/core`).
- [ ] Document product intention in README (free OSS, no SaaS, self-host, BYO keys, custom domains).
- [ ] Document AI, Resend, and custom-domain / TLS operator notes in `.env.example` and self-host runbook.
- [ ] Agree PR slicing (below) so migrations stay reviewable.

### Phase 1 — Identity & invite auth

**DB / auth**

- Add via Better Auth `additionalFields` (then regenerate `auth.schema.ts` — do not hand-edit):
  - `profileName: string` (unique, not null after signup flow complete)
  - Optional: keep display `name` separate from `profileName`
- New table `profile_slug_alias`:
  - `id`, `userId`, `slug` (unique), `createdAt`
  - On rename: insert previous `profileName` into alias; update `user.profileName`
  - Resolve public: `user.profileName = slug OR alias.slug`
- New table `invite`:
  - `id`, `code` (unique), `createdByUserId` (nullable for bootstrap), `usedByUserId` (nullable), `expiresAt` (nullable), `createdAt`, `usedAt`
  - Bootstrap: seed one invite or env `BOOTSTRAP_INVITE_CODE` for first operator after empty DB

**Auth behavior**

- Remove “only first user” hard reject.
- Allow `user.create` only when:
  - valid unused non-expired invite code is presented, **or**
  - zero users exist (bootstrap first account without invite — optional safety hatch).
- Signup UI: email/password (and existing OAuth paths) + **invite code** + **profileName**.
- Validate `profileName` server-side (see rules below).
- First user: can create invites from settings (simple list + create/revoke).

**`profileName` rules** (core schema)

```
- 3–30 characters
- ^[a-z0-9]+(?:-[a-z0-9]+)*$
- unique among user.profileName + profile_slug_alias.slug
- reserved set (non-exhaustive): app, api, dashboard, settings, login, sign-in,
  signup, admin, jobs, applications, resumes, stacks, projects, experiences,
  onboarding, health, assets, static, www, mail, support, help, privacy-policy,
  terms-of-service, repos, playground, invite, account, profile
```

### Phase 2 — Tenant columns + backfill + constraints

**Add `userId` (FK → user, onDelete cascade)** to:

| Table                | Notes                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `experience`         | required                                                                                                                              |
| `project`            | required                                                                                                                              |
| `stack`              | required; change unique on `name` → `(userId, name)`                                                                                  |
| `resume`             | required; `default` becomes per-user (partial unique: one default per userId)                                                         |
| `portfolio_entry`    | required; unique `(userId, type, entityId)` or keep type+entityId if entity IDs are global UUIDs **and** always validated with userId |
| `project_stack_scan` | if user-owned scans                                                                                                                   |

**Migration strategy (single migration or ordered pair):**

1. Add nullable `user_id` columns.
2. Backfill: `UPDATE … SET user_id = (SELECT id FROM "user" ORDER BY created_at ASC LIMIT 1)`.
3. Fail migration if zero users and orphan rows exist (or delete orphans in dev only).
4. Set `NOT NULL` + FK + indexes `(user_id, sort_order)`, etc.
5. Drop global uniques; create composite uniques.

**Resume author enum**

- Prefer rename `admin` → `user` in the same epic if low-risk (enum migration in Postgres).
- If noisy, alias in app layer first (`admin` means human) and migrate enum in a follow-up PR — but stop using “admin” in new copy.

### Phase 3 — Repositories & API tenant scope

**Repository contract**

- Every read/write that returns private data takes `userId: string` (or options bag).
- `findById(id)` for mutations becomes `findByIdForUser(id, userId)` → `null` if wrong tenant (API maps to NOT_FOUND, not FORBIDDEN — avoid IDOR oracles).
- Replace `findAll()` with `findAllByUserId(userId)`.
- Onboarding apply: stamp `userId` on every inserted entity.
- Portfolio toggle: assert entity.userId === session.user.id (contacts already user-scoped).

**Procedures**

- `protectedProcedure` handlers always pass `context.session.user.id`.
- Public portfolio procedures resolve `userId` via **custom domain Host** or **profileName** (shared helper).
- Remove `userRepository.findFirst()` as “the owner” for portfolio/contact public paths.
- `ownerProcedure` (GitHub): remains “this user owns this github_config”, not “the site owner”.

**Core / mappers**

- Output schemas: include `userId` only where needed for admin tooling; public outputs never need other users’ ids beyond profile display.
- Profile public DTO: name, summary, contacts (opted-in), profileName, optional publicBaseUrl (custom domain or path).

### Phase 4 — Storage, agents & BYO AI wiring

- Generated resume keys: `{userId}/resumes/{uuid}.pdf` (align with resume-sources).
- Resume repository list/delete/setDefault scoped by `userId`.
- Mastra / agent runs: pass `userId` in workflow input; never read unscoped portfolio.
- Hub chat / tools: tool context includes `userId` from session.
- **Provider resolution:** prefer env-configured BYO keys; typed error when AI is requested but not configured. Do not hardcode a commercial “platform default” that bills the maintainer for all users.
- Document self-host AI env vars alongside existing agent config.

### Phase 5 — Public routing by profileName + SEO

**URL model (path door)**

| Before                    | After                                                  |
| ------------------------- | ------------------------------------------------------ |
| `/` single portfolio home | Community landing on **primary app host**              |
| (none)                    | `/$profileName/` portfolio home                        |
|                           | `/$profileName` + existing section structure as needed |

**Routing notes (TanStack)**

- Add public route tree under `/$profileName/` (path param).
- **Reserved segments** must not be captured as profile names (dashboard, sign-in, repos, etc.).
- Sitemap: emit path URLs; include custom-domain URLs when verified (Phase 6).
- SEO `head()`: per-profile title/description from that user’s profile.

Can ship path public sites before custom domains, but do not invent `SINGLE_USER_MODE` as a stopgap — use Phase 6 for personal domains.

### Phase 6 — Custom domains + Domain settings UI

- Schema: `user_custom_domain` (or equivalent) + migration.
- oRPC: `domain.get`, `domain.set` / `domain.create`, `domain.verify`, `domain.remove` (names flexible).
- Settings → **Domain** UI: instructions, status, verify, remove.
- `resolvePublicPortfolioContext`: Host → verified domain → portfolio at `/`.
- On custom domain Host: serve public portfolio routes at root; redirect `/dashboard` (and auth) to primary app origin.
- Canonical public URL helper used by settings and SEO.
- Self-host docs: DNS + TLS (Caddy/Cloudflare example) + verify flow.
- Maintainer dogfood: set own domain, confirm `/` shows portfolio while second invite user still works on primary host.

### Phase 7 — Dashboard UX polish & hardening

- Settings → Profile: `profileName` rename + alias; show path URL and custom-domain URL when verified.
- Settings → Account: invite management.
- Optional copy: “AI and email use keys configured by the instance operator” (no billing UI).
- Onboarding: unchanged flow, but all writes carry `userId`.
- Grep for `findFirst`, `findAll()`, `REGISTRATION_CLOSED`, “admin user”, unscoped queries.
- Update `.agents/*` where single-owner or SaaS assumptions are documented.
- README: free OSS intention; custom domains; self-host in minutes.
- Manual test checklist (below).
- No Seeker CRM UI in this epic.

---

## Explicit non-goals

### This epic

- Job applications / preferences tables
- Resend → employer or inbound tracking
- Org/workspace RBAC
- Open public registration (invite-only only, except empty-DB bootstrap)
- Employer job publishing
- **`SINGLE_USER_MODE`**
- **Any TLS/certificate issuance or renewal** (operator / Cloudflare / Caddy only)
- Path URL → custom domain permanent redirect (nice-to-have later)

### Product / business (parked indefinitely unless intention changes)

- Stripe / subscriptions / plans / quotas / usage metering for revenue
- Platform-funded LLM or mail for all users
- Sales-led GTM, enterprise contracts, marketplace liquidity goals
- Feature-gating core portfolio or CRM behind payment

---

## PR slicing (recommended)

| PR      | Scope                                                                              | Risk              |
| ------- | ---------------------------------------------------------------------------------- | ----------------- |
| **PR1** | Invite table + auth gate + signup invite/profileName fields + settings invite UI   | Auth-critical     |
| **PR2** | `userId` columns + backfill + composite uniques + repository signatures            | Data-critical     |
| **PR3** | Wire all protected routers to pass `userId`; fix onboarding apply                  | Security          |
| **PR4** | Public portfolio by `profileName`; slug alias + rename; community `/`; sitemap/SEO | Routing           |
| **PR5** | **Custom domains:** schema, verify, Host routing, Domain settings UI, docs         | Routing + product |
| **PR6** | Cleanup admin language; agent `userId` + BYO AI failure modes; README intention    | Polish            |

Do not merge PR3 without PR2. PR5 depends on PR4 (public portfolio surface exists). PR5 may split into schema/API then UI if large.

---

## Testing checklist

1. Empty DB → bootstrap first user (with or without invite per design) → gets `profileName`.
2. First user creates invite → second user signs up → empty portfolio, isolated data.
3. User A cannot read/update/delete User B entity IDs (404).
4. Stack name “React” allowed for both users.
5. Public `/{profileName}` shows only that user’s portfolio_entry rows.
6. Rename profileName → old URL redirects/resolves; new URL works.
7. Reserved path `/dashboard` never treated as profile.
8. Resume list/default isolated per user; storage keys prefixed.
9. Onboarding import applies only to session user.
10. Invite reuse after use fails; expired invite fails.
11. **Custom domain pending:** Host does **not** serve portfolio yet.
12. **Custom domain verified:** `Host: user-domain` + `/` shows that user’s portfolio; primary host `/{profileName}` still works.
13. User B cannot verify/claim User A’s hostname; duplicate hostname rejected.
14. Remove domain → Host no longer maps; path URL still works.
15. On custom domain, `/dashboard` redirects to primary app (if that policy is implemented).
16. Second user still works while maintainer uses custom domain (no registration lock).
17. **AI:** with keys unset, non-AI flows work; AI endpoints fail with clear “not configured.”
18. **Resend:** with `RESEND_API_KEY` unset, app still runs; auth mail skipped or no-ops as designed today.

---

## Follow-up epic: Seeker CRM

**Pipeline MVP designed:** `docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md`  
**Plan:** `docs/superpowers/plans/2026-07-28-seeker-applications-crm.md`  
**ADRs:** `0024-application-stage-and-outcome.md`, `0025-entity-form-sheet.md`

Depends on this multi-user foundation. Still **free OSS / BYO keys** — not a paid product.

**In MVP design:** `application` (active stages + terminal outcomes, board + list, Sheet CRUD, linked `resumeId`, hiring urgency); entity form Sheet migration for experiences/projects/stacks.

**Still later:** `job_preference`; tags/follow-ups/uploads; match / tailor resume (BYO AI); Resend product→user reminders; drafts / employer send / inbound / thin job publish — only if still aligned with community intention.

---

## Success criteria

- Two invite-created accounts can use the product simultaneously with **zero data leakage**.
- Public portfolios resolve by **profileName** on the primary host.
- **Custom domain:** a verified domain in Domain settings serves that user’s portfolio at `/` on that Host; multi-user remains intact.
- Maintainer can dogfood **personal domain + community multi-user** on one codebase.
- Single-owner assumptions (`findFirst` owner, global uniques, registration closed) are gone.
- **Product intention is visible in docs:** free OSS, self-host, BYO AI/Resend, custom domains, no SaaS billing path required.
- Codebase is ready for Seeker CRM tables that are `userId`-scoped from day one, without reintroducing platform-paid AI assumptions.
