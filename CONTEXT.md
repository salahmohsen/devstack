# Portfolio Context

A glossary of terms specific to the portfolio's evidence, output, skills,
and cache-invalidation layers. General programming terms (workflow, tool, vector,
etc.) do not belong here even if the project uses them heavily.

## Multi-user tenancy

**Username** (`username`, Better Auth username plugin):
Public URL slug on the primary app host (`/{username}/…`). Required at
signup (or auto-assigned from GitHub login / email with unique suffix), unique,
renamable. Validated in `@tsu-stack/core` (length, charset, reserved path
segments such as `dashboard`, `api`, `sign-in`). Same field as Better Auth
`user.username` — path key and auth plugin identity, not GitHub `login`.
_Avoid_: profileName (deprecated), conflating with GitHub username.

**Slug alias** (`username_slug_alias`):
Row mapping a former `username` to the same `userId` so old path URLs
redirect after rename. New names must not collide with live usernames or
existing aliases.
_Avoid_: redirect table (generic), vanity URL. Historical table name: `profile_slug_alias`.

**Invite**:
Named registration link or emailed single-use code. Empty database bootstraps
the first user without an invite. After that, **signup mode** (platform
setting) is `invite_only` (default) or `open`. Codes arrive via signup body,
short-lived cookie, or OAuth state — not a user column. Redemptions attribute
the new user to the invite. Super admin creates and names invites; members
cannot. _Avoid_: invite-as-role; treating super admin as owner of other
tenants’ portfolios.

**Super admin**:
Platform operator (`user.role = admin`). UI label Super admin. Lists users,
manages invites and signup mode, can ban and impersonate. Does not own
another tenant’s `userId` rows — impersonation is how they act as that tenant.
_Avoid_: “admin user” as the sole portfolio owner.

**Signup mode**:
Install-wide `invite_only` | `open` on `platform_setting`. Operator toggle
in Admin → Access. _Avoid_: assuming registration is always closed.

**Custom domain** (`user_custom_domain`):
Optional verified hostname that maps Host → that tenant’s portfolio at `/`.
App stores hostname + verification state only; operator terminates TLS.
Browser oRPC from that host requires API origin trust (verified hostname in CORS / Better Auth), not only Host → userId routing.
_Avoid_: white-label SaaS domain product, automatic cert issuance.

**Primary app host**:
Canonical community origin from the host of `VITE_WEB_URL`. Dashboard, auth, and
path portfolios (`/{username}`) live here. Custom domains may not claim this
hostname.
_Avoid_: “main domain” without distinguishing path vs Host routing.

**Tenant `userId`**:
Every private domain row (experience, project, skill, resume, portfolio entry,
etc.) is scoped by the Better Auth user id. Public RPCs resolve Host and/or
`username` → `userId` then load only that tenant’s opted-in evidence.
_Avoid_: `ownerId`, “admin user” as the sole portfolio owner, unscoped `findAll()`.

**BYO AI**:
LLM features use per-user BYO provider keys in Settings → AI (sealed in `user_ai_settings`). Agent HTTP uses Better Auth sessions via `MastraAuthBetterAuth`.
No platform-funded model budget. Missing keys: detect-stacks skips AI categorize
and falls back; resume import returns extract warnings; CRUD still works.
_Avoid_: assuming a shared cloud key for all tenants.

**BYO Resend**:
Transactional mail is optional. Set `RESEND_API_KEY` (and `EMAIL_FROM`) to
enable; unset skips sending. Auth/product mail only — not employer apply spam.
_Avoid_: platform-paid unlimited mail.

**TLS is not an app concern**:
Operators terminate HTTPS (Cloudflare, Caddy, reverse proxy). The app verifies
domain ownership (DNS) and routes by Host; it does **not** issue or renew
certificates.
_Avoid_: ACME in-app, Let’s Encrypt automation as a product feature.

**Public GitHub surface**:
Per-tenant public GitHub pages and APIs. Path form:
`/{username}/repos` (and tree/blob under that). On a **verified custom
domain**, Host-scoped `/repos` (no username path segment). Public RPCs take
`username` and/or resolve Host → `userId`, then use that tenant’s OAuth
token server-side (`resolvePublicGitHubSourceForUser`). Never a global
“first GitHub account”.
_Avoid_: bare `/repos` on the primary app host as a global owner hub;
unscoped `findPublicGithubSourceSettings` / `findAnyGitHubAccount`.

**github_config**:
Per-user row (`userId`) holding display `githubUsername` (and legacy
columns cleared of PATs). Tokens live on Better Auth `account` for that
user only — not env vars and not a shared site-owner secret.
_Avoid_: env-owned public token, single global github_config row.

## Seeker applications (CRM)

**Application** (`application`):
Private per-tenant job application row (`userId`). Tracks a role at a
company through the hiring pipeline; may link a generated `resumeId`.
Never public portfolio. Spec:
`docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md`.
ADR: `docs/adr/0024-application-stage-and-outcome.md`.
_Avoid_: treating applications as portfolio_entry types; employer job posts.

**Application stage**:
Active pipeline position: `saved | applied | screening | interview | offer`.
Board columns; drag between columns updates stage only. Open apps only
(`outcome` null) appear on the board.
_Avoid_: using stage for terminal endings (rejected/ghosted).

**Application outcome**:
Terminal close label: `rejected | withdrawn | ghosted | accepted`, or null
if open. Set on close with `outcomeAt`; last stage is frozen. Closed rows
live in list filters, not board columns.
_Avoid_: modeling outcomes as extra kanban stages in v1.

**Hiring urgency**:
Per-application hiring pressure: `unknown | immediate | soon | flexible`.
Not the tenant’s job preference.
_Avoid_: conflating with job preference.

**User job** (`user_job`):
Per-tenant staging row for one freehire listing (`userId` + `freehireSlug`
unique). Snapshot of the listing (title, company, salary, skills, JD) plus
`queryHash`/`queryFilters` — the facet settings that produced it. Raw material
for AI scoring; the landed [Application](CONTEXT.md) is the user-facing row.
_Avoid_: treating it as shared across tenants; putting matchScore on it
(scores live on applications); keeping rows whose `queryHash` no longer
matches the tenant's settings.

**Freehire facets**:
The per-tenant filter vocabulary sent to the freehire search API — regions,
countries, cities (one OR group: "any of these places"), categories, skills,
seniority, experience years, work modes, employment types, salary floor,
visa/clearance, company type/size/domains/collections, `openWithinDays`,
reality. Whitelists live in `packages/core` facets.ts; invalid values are
dropped client-side because freehire silently returns zero results for them.
_Avoid_: sending a facet value freehire doesn't know; treating geography
facets as ANDed.

**Years required**:
Minimum years the _role_ asks for (`experienceYearsMin` from freehire
enrichment, mirrored on the user job and application). Shown as a badge.
Caps personal `matchScore`. Does not hide the job from New jobs.
_Avoid_: dropping listings that ask for more years than the profile.

## Job search

**Job preference**:
The tenant's structured search settings: freehire facets (geography, role
categories/keywords, seniority/years, terms, company filters, freshness),
work modes, monthly salary floor plus currency, minimum match score, daily
AI-scoring cap, and the mail-import toggle. Source of truth for what they
want next; saved facets also drive the per-user freehire fetch directly.
_Avoid_: identity, search brief, hiring urgency (that is per application).

**Per-user fetch**:
Each tenant's jobs come from freehire directly, triggered three ways through
one coalescing land queue: a staggered daily cron (only tenants with facets
saved and activity within 7 days), an immediate refetch on settings save,
and the manual Find-jobs-now button (also re-enrolls lapsed tenants).
Results upsert into `user_job`; a failed fetch keeps the previous shelf
(fail-soft, no retries).
_Avoid_: global catalog crawls; retry loops against freehire.

**Agent take**:
Short markdown on an application explaining fit. At most five concise
bullets about the role (not a skill dump). Humanizer voice (plain, no
hype, no invented facts). Written at land / harvest / regenerate. Inspect
shows Have / Close / Missing chips above it (checkable tools only;
role phrases are take prose, not chips).
_Avoid_: 1–3 sentence blurbs; selling the job; a user-facing ATS score.

**Skill alias**:
Another spelling of the same skill (React.js → React). Shared list in
`packages/core` plus the tenant’s `aliases` on the skill row. Counts as
Have. Product field: **Aliases**.
_Avoid_: alternativeNames; treating related tools as aliases (TypeScript
is not JavaScript).

**Close skill**:
A JD token related to a stack the seeker has, not the same skill
(JavaScript vs TypeScript, Azure vs AWS). Yellow chip. Does not create a
stack. Small hardcoded families in `packages/core`.
_Avoid_: marking Close as Have; LLM-invented families.

**Search brief**:
A per-tenant generated markdown document for AI layers. One artifact: opening
and skills paragraphs describe who the seeker is (from experiences, skills,
projects, profile); lists restate job preference. Settings fields are source
of truth. Persisted per tenant next to job preference (markdown plus that
hash). Any successful write to job preference or evidence (Settings, hub
speech, conversational evidence confirm) eagerly clears that cache. The next AI layer rebuilds lazily. Never score against the previous markdown after invalidate. Spoken hub
edits write job preference, then invalidate the brief. “What is my
identity?” reads this brief. Paragraphs are never hard stops — only
Exclusions (when configured), compensation Minimum, and the seeker's facet
floors are law. Evidence changes refresh prose and skill lists only.
_Avoid_: a second identity file, treating the markdown as the editable
source, scoring from prose.

**Search brief change**:
After a rebuild, the hub thread shows a compact file-diff disclosure
(previous snapshot vs new markdown). No side panel. The snapshot is for
that disclosure only. Hub chat evidence writes stay File Diff Confirm.
List `+` and inspect Edit still remount the original entity forms.
_Avoid_: scoring the snapshot; opening the side panel for the brief.

**Evidence**:
The seeker’s portfolio facts: experience, project, and stack (skill) rows.
Hub and tailored resumes read these. Not a Resume document and not
Application kit.
_Avoid_: resume facets; identity facets; kit bullets as a second source of
truth.

**Hub home**:
Full-page hub chat at `/dashboard`.
_Avoid_: a second agent product; treating the floater as a different model.

**Hub floater**:
Assistant modal on dashboard routes that are not Hub home. Same thread as Hub
home. Inspect **Open in agent** opens this, not Hub home. Expand in the
floater header navigates to Hub home.
_Avoid_: a second chat runtime; covering the inspect panel.

**Hub operator**:
The hub supervisor runs the seeker loop on the same objects as the dashboard:
job preference, search brief, Find jobs now, New jobs, applications. Chat is
another door,
not a second product and not a replacement for Settings or the board.
Spoken soft preference fields write immediately. Hard stops (facet
geography/role filters, salary floor) confirm on a hub ApprovalCard whose
body is a File Diff of the proposed search brief vs current. Evidence in **chat** is
the same pattern (interview, then File Diff + Confirm). Dual entry: list `+`
and inspect Edit remount `ExperienceForm` / `ProjectForm` / `StackForm`.
Hub inspect Edit uses `EntityFormHost` (`completeOnClose: false`) and does
not re-register `open-entity-form` as a model tool. Spec:
`docs/superpowers/specs/2026-08-16-conversational-evidence-approval-design.md`.
_Avoid_: career-coach clone; a second identity markdown file.

**Application mention**:
A hub composer directive chip that names one Application by id
(`:application[label]{name=<applicationId>}`). Same chip family as
capability mentions (Today, Job rules); different type. The chip is a
pointer, not the JD, kit, or mail payload.
_Avoid_: file attachment; hidden model context; dumping listing HTML into
the chip; “tool badge” as a second concept.

**Application kit**:
Apply materials stored on a tracked Application: linked resume, cover
letter text, outreach text. Not its own entity. Inbox rows usually have
none.
_Avoid_: resume facets; treating kit PDFs as the tool payload; a second
resume product.

**Entity inspect panel**:
Dashboard **view** for applications, experiences, projects, and skills uses
the inspect side panel (inset Sheet below `xl`). Shared shell; kind-specific
body. Inspect stays view-only until the user hits Edit. List `+` and inspect
Edit remount the original form sheets. Hub hosts (inspect / form / Today)
win the side panel (`hostOwnsPanel`). ADR 0025 still describes that chrome.
_Avoid_: long multi-field entity forms in modals; a second identity markdown
file.

## Career Inbox and AI platform

**Career Inbox**:
Tenant-scoped in-app mail product for hiring signal (recruiters, ATS,
application-linked threads). Hybrid product: career-first intelligence with
mail-client chrome. Spec:
`docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`.
_Avoid_: personal Gmail clone; treating all synced mail as portfolio content.

**Unsorted**:
Career Inbox bucket for messages with no system career label and no user
smart-rule label. Not abuse spam filtering.
_Avoid_: spam, junk, noise (as product folder names).

**Smart rule**:
User-defined mail category (icon, title, description) that extends the
classify allowlist and prompt; may appear as a hub card when count > 0.
_Avoid_: Gmail label sync as the source of truth.

**Mail reply (on-the-fly)**:
Generate an ephemeral subject + body in the Career Inbox composer, then
human-confirm send. No durable Review queue; notifications for career mail
open `/dashboard/mail/all`.
_Avoid_: auto-send without explicit user confirm.

**Notification email**:
User-chosen destination for system emails (draft ready, security OTP, etc.).
May be Gmail or another address; not the Career Inbox product From identity.
_Avoid_: assuming Resend From address is where the user reads notifications.

**System notification mail**:
Messages with product purpose “notification” (or matching the notification
identity). Hidden from default Career Inbox lists automatically.
_Avoid_: showing OTP/draft-ready mail as recruiter threads.

**AI correction**:
User-selected correct action after an auto-apply (stage, labels, etc.).
Stored per tenant for few-shot learning; also recorded as Mastra feedback /
dataset ground truth where applicable.
_Avoid_: treating thumbs-up alone as model fine-tuning.

## Cache invalidation

**Revalidation signal**:
A durable row in `github_revalidation_signal` recording that a topic was
invalidated by an external event. The row's `updated_at` is the database
transaction-start time of the writer (`sql\`now()\``). Staleness rule: a
cached row with `fetched*at < signal.updated_at`is stale. Used for
per-event invalidation of topics without a natural cache-group version
(e.g.`installationAccess`, `pulls.mine`, `notifications`).
\_Avoid*: Event log, invalidation log, webhook log.

**Cache namespace**:
A durable row in `github_cache_namespace` whose `version` integer
increments on every invalidation. Staleness rule: a cached row whose
`namespace_version !== current_version` is stale (monotonic — the row
stays stale forever once the namespace moves past it). Used for bulk
invalidation of a known cache group (e.g. `repos.list`, the
`pulls.*`/`issues.*` lists).
_Avoid_: Cache group, invalidation counter.

**Signal relay**:
Socket.IO gateway on the Hono server with optional Redis adapter for
cross-instance fan-out of recently-bumped GitHub signal keys to browser
clients. Clients that miss a broadcast reconcile via the
`getRevalidationSignals` oRPC route (`use-github-signal-stream.ts` on
WebSocket open, `visibilitychange`, focus, `online`, and a 20s poll when
disconnected). See ADR `0021-socketio-redis-pubsub-broadcast-adapter`.
_Avoid_: WebSocket hub, pub/sub relay, Durable Object.

**Delivery ID cache**:
A row in `github_webhook_event` keyed by the GitHub webhook's
`X-GitHub-Delivery` header. Prevents duplicate processing when GitHub
redelivers an event. Persisted in Postgres so the dedup state survives
restarts; old rows are pruned by a separate retention job.
_Avoid_: Webhook dedup, idempotency cache.

## Evidence

**Portfolio entry**:
A row in `portfolio_entry` representing one evidence item
(experience, project, skill (`skill` row), or contact) that the **tenant user** has
opted to expose on their public portfolio surface and to AI agents.
Scoped by `userId`. Acts as a visibility gate — the row's existence,
not a boolean column on the entity, is what makes the item visible. The
entity holds a nullable `portfolio_entry_id` FK. Created and removed
synchronously with the entity's create/update/toggle, in the same
transaction.
_Avoid_: Inclusion flag, visibility toggle, AI flag, global portfolio list.

**Entity type**:
The `type` column on `portfolio_entry`. One of
`"experience" | "project" | "stack" | "contact"`, declared as a
`pgEnum` so the database rejects unknown kinds. Pairs with a text
`entity_id` column to identify the row in the corresponding entity
table; the cross-table referential integrity is enforced in the
toggle handler (a single Postgres column cannot FK four tables at
once). Cascades on entity delete.
_Avoid_: Source type, row kind, entry kind.

**Portfolio filter**:
The RSQL-style query string accepted by `portfolio.list`. Lets a
caller narrow the returned evidence set by `type`, year range, title
substring, etc. without the API needing to learn each new query. The
parser in `packages/api/src/lib/rsql.ts` translates the string into a
Drizzle `where` clause scoped to entity-table columns. Default
behavior (no `filter` prop) returns every opted-in row of every type.
_Avoid_: Search query, RSQL where, filter DSL.

**Include-in-portfolio toggle**:
The dashboard-side UI element that calls `portfolio.toggle` to add or
remove a `portfolio_entry` row for the entity being edited. Replaces
the old per-entity `enable_ai` switch. The `enable_ai` field is gone
from `experience`, `project`, and `stack` (skills catalog); toggling inclusion is a
separate action from editing the entity.
_Avoid_: AI switch, include flag, visibility switch.

**Analysis**:
User-authored private markdown on a project (what was done, why,
trade-offs, metrics, lessons). The tenant writes it in the project
form only. Hub and resume-generation read the full text as source of
truth for that project; they do not author it and do not speak it in
chat. Not on the public project page. Optional.
_Avoid_: `narrative` (different scope), `caseStudy`, `writeup`,
`breakdown` (public-surface words), `notes`, `comments`; hub patching
this column.

## Output

**PDF renderer**:
`@tsu-stack/pdf` — maps portfolio/profile to RenderCV **engineeringresumes**
YAML, spawns `rendercv` → Typst, then `typst compile --pdf-standard ua-1`
for A4 PDF/UA-1 bytes. Cover letters use a vendored Typst string in the
same family. Shared by Hono `resume.generate` and the agent accept path.
Fail closed when binaries are missing (no pdfnative fallback).
_Avoid_: PDF engine, document generator, pdfnative, @react-pdf/renderer.

**Tagged PDF**:
A PDF with a structure tree for reliable ATS extraction and screen-reader
accessibility. Resume/cover output is PDF/UA-1 via
`typst compile --pdf-standard ua-1` (not pdfnative `tagged: true` /
PDF/A-2b).
_Avoid_: Accessible PDF, structured PDF.

**Resume builder**:
The orchestrator that fetches portfolio evidence + profile, calls the
PDF renderer to produce a PDF byte stream, uploads the file to R2, and
persists the result in the resume table. Implemented as the
`resume.generate` oRPC procedure in
`packages/api/src/routers/resume.router.ts`. The single entry point
for producing a resume PDF; distinct from the PDF renderer (which is a
pure engine with no resume-domain knowledge).
_Avoid_: PDF generator, resume service, resume orchestrator.

**Resume** (generated):
A row in the `resume` table representing a portfolio-derived PDF
artifact for a tenant (`userId`), storage key under `{userId}/resumes/…`
(or legacy `resumes/…`), author `user|agent` (historical enum value
`admin` means human/user), optional default **per user**. Output only —
never an uploaded source for import.
_Avoid_: Uploaded CV, resume source, import PDF.

## Onboarding

**User onboarding** (resume import):
First-run or re-import flow that helps a **signed-in user** populate
their profile and evidence from a resume PDF. Completes when they Apply
a resume import draft or Skip; completion is `onboardingCompletedAt` on
that user. Soft CTAs only — does not hard-lock dashboard routes.
_Avoid_: Setup wizard lock, forced onboarding, “site owner onboarding”.

**Onboarding completed at**:
Nullable timestamp on **each** user set by Apply or Skip. Soft CTAs and
empty-state banners treat null as incomplete for that session user.
_Avoid_: onboarding flag, setup done boolean (prefer timestamp).

**Resume source (session)**:
A temporary PDF object in storage used only as input to resume import,
keyed under the session user's prefix at `{userId}/resume-sources/…`.
Not a `resume` row. Deleted after Apply, Skip (when key known), Discard,
or replace-upload. No durable source table in v1.
_Avoid_: Uploaded resume record, media_asset resume, global resumes/ prefix.

**Resume import draft**:
The structured, client-held proposal produced by the resume-import
workflow (profile, experiences, projects, skills with selection and
portfolio inclusion defaults) before transactional Apply. Not persisted
server-side in v1.
_Avoid_: Import job, pending onboarding entity, server draft row.

**Resume import**:
The pipeline: session resume source → API text extract → Mastra
resume-import workflow → client review of resume import draft →
transactional apply into profile/evidence (with portfolio entries for
selected rows). Distinct from resume builder (generate).
_Avoid_: Resume parse service, CV sync, reverse resume builder.

## Skills and stacks

**Skill** (`skill` table; dashboard **Skills** at `/dashboard/skills`):
A named technology or practice the seeker claims — framework, language,
library, tool, **or** something that is not a code dependency (CI/CD,
process, platform). Broader than a project's real stack. Display `name`
(customizable), optional `npmPackage` (for detect-stacks dedup), `type`,
optional `icon`, optional `aliases` (other labels for the same skill,
shown as tags). Linked to projects via `project_stack` when that skill
is used on a project. A skill may exist with no project and no npm
package. Product UI says **Skills**, not Stacks, for this catalog.
_Avoid_: calling the catalog “stacks” in product copy; requiring every
skill to be an npm dependency; storing npm packages as aliases (those
live on `stack_dependency`); alternativeNames.

**Stack** (on a project):
The project's actual tech — typically dependencies from linked repos.
Shown on the project form as **Stack**. Detect-stacks writes here.
_Avoid_: using “stack” for the tenant-wide Skills catalog.

**Skill type**:
The `type` column on `skill`. One of `"framework" | "language" |
"database" | "ui" | "auth" | "deployment" | "testing" | "ai" |
"tooling" | "storage" | "other"`. Categorizes a skill for
filtering and display grouping. Assigned by the LLM during
detect-stacks, editable by the user.
_Avoid_: Category, kind, group.

**npm package**:
The `npm_package` column on `stack_dependency`. The raw npm package name as it
appears in `package.json` (e.g., `"react"`, `"@tanstack/react-query"`).
Nullable — skills such as CI/CD or “REST API” have none.
Dedup and alias matching are **per tenant** (`userId`). Skill display
`name` is unique per `(userId, name)`.
_Avoid_: Package name, npm name, dependency name as a global unique.

**Detect-stacks workflow**:
A Mastra workflow (`detect-stacks-workflow`) that scans GitHub
repositories' `package.json` files to auto-detect a **project's** tech
stack (real dependencies). Triggered from the Project Form's
“Detect stacks” button — keep that name. Four steps:
fetch-repo-package-jsons → extract-dependencies →
categorize-with-llm → deduplicate-and-format. Streams step progress
to the UI via oRPC for real-time `ShimmeringText` feedback. Includes
10 enhancements: auto-icon mapping, health metadata, confidence
scoring, stack aliases, usage frequency, stack diff, batch detection,
language aggregation, auto-descriptions, and portfolio tech section.
May create or attach **skill** rows for detected packages.
_Avoid_: renaming Detect stacks to Detect skills; Stack scanner;
dependency detector; auto-stack.

**Stack alias**:
A row in `stack_alias` mapping an alternative npm package name to an
existing skill. Prevents duplicate skills when multiple npm packages
represent the same technology (e.g., `react` and `react-dom` both
map to the "React" skill). Checked alongside `stack.npm_package`
during detect-stacks deduplication. Scoped with the parent skill’s tenant.
_Avoid_: Package alias, alternative name, npm alias.

**Stack health**:
Cached npm registry metadata stored in `stack.health_status`: whether
the package is deprecated, its weekly download count, and last publish
date. Refreshed on each detect-stacks scan. Displayed as badges in
the review dialog and on skill cards.
_Avoid_: Package health, npm status, dependency health.

**Stack confidence**:
The LLM's confidence level (`high | medium | low`) in its type
categorization of a **detected dependency**. Stored in `stack.confidence`. Low-
confidence items get a warning badge in the detect-stacks review dialog.
_Avoid_: Classification confidence, categorization certainty.

**Stack scan**:
A row in `project_stack_scan` recording one detect-stacks workflow
execution for a project: the timestamp, detected npm package names,
and resulting skill IDs. Used to compute stack diffs on re-scan
(new/unchanged/removed packages).
_Avoid_: Detection scan, package scan, dependency scan.

**Language aggregation**:
The computed breakdown of programming languages across a project's
linked GitHub repositories. Derived from `GitHubUserRepoSummary.language`
weighted by repo relevance. Displayed on the project page as percentage
badges (e.g., "TypeScript 60%").
_Avoid_: Repo languages, language breakdown, tech breakdown.
