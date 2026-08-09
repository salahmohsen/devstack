# Portfolio Context

A glossary of terms specific to the portfolio's evidence, output, stack, and
cache-invalidation layers. General programming terms (workflow, tool, vector,
etc.) do not belong here even if the project uses them heavily.

## Multi-user tenancy

**Profile name** (`profileName`):
Public URL slug on the primary app host (`/{profileName}/…`). Required at
signup, unique, renamable. Validated in `@tsu-stack/core` (length, charset,
reserved path segments such as `dashboard`, `api`, `sign-in`).
_Avoid_: username alone when you mean the public path key; handle (ambiguous).

**Slug alias** (`profile_slug_alias`):
Row mapping a former `profileName` to the same `userId` so old path URLs
redirect after rename. New names must not collide with live profile names or
existing aliases.
_Avoid_: redirect table (generic), vanity URL.

**Invite**:
Single-use (or revocable) registration code. Empty database bootstraps the
first user without an invite; later signups require a valid invite. Not a
user column — code arrives via signup body, short-lived cookie, or OAuth state.
_Avoid_: open registration, invite-as-role.

**Custom domain** (`user_custom_domain`):
Optional verified hostname that maps Host → that tenant’s portfolio at `/`.
App stores hostname + verification state only; operator terminates TLS.
Browser oRPC from that host requires API origin trust (verified hostname in CORS / Better Auth), not only Host → userId routing.
_Avoid_: white-label SaaS domain product, automatic cert issuance.

**Primary app host**:
Canonical community origin from the host of `VITE_WEB_URL`. Dashboard, auth, and
path portfolios (`/{profileName}`) live here. Custom domains may not claim this
hostname.
_Avoid_: “main domain” without distinguishing path vs Host routing.

**Tenant `userId`**:
Every private domain row (experience, project, stack, resume, portfolio entry,
etc.) is scoped by the Better Auth user id. Public RPCs resolve Host and/or
`profileName` → `userId` then load only that tenant’s opted-in evidence.
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
`/{profileName}/repos` (and tree/blob under that). On a **verified custom
domain**, Host-scoped `/repos` (no profileName segment). Public RPCs take
`profileName` and/or resolve Host → `userId`, then use that tenant’s OAuth
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
Not the user’s global job preference profile.
_Avoid_: conflating with `job_preference` (future).

**Entity form Sheet**:
Dashboard create/edit for applications, experiences, projects, and stacks
uses a right side Sheet (drawer), not a centered Dialog. Short tools and
delete confirms stay Dialog/AlertDialog. ADR:
`docs/adr/0025-entity-form-sheet.md`.
_Avoid_: long multi-field entity forms in modals that cover the list/board.

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

**Review item**:
Durable unit on `/dashboard/review` awaiting human confirmation (e.g. a
reply draft in Assist mode). List + confirm CTA + edit drawer + view panel.
_Avoid_: burying confirm-only state only inside the mail reader.

**AI autonomy**:
Per-user policy for how far agents may act without confirm. Mail replies:
Assist (always generate draft, wait for confirm) or Full (auto-send).
Controlled only in AI settings — never in notification settings.
_Avoid_: tying send policy to notification toggles.

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
(experience, project, stack, or contact) that the **tenant user** has
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
from `experience`, `project`, and `stack`; toggling inclusion is a
separate action from editing the entity.
_Avoid_: AI switch, include flag, visibility switch.

**Analysis**:
A nullable `text` column on the `project` table holding user-authored
markdown — what was done, why, trade-offs, metrics, lessons. Private
input for the resume-generation agent: the agent reads it when
composing a tailored resume bullet but the column is not rendered on
the public project page and is excluded from `ProjectPublicOutputSchema`
so it never leaves the server in a public response. Optional; default
`null`. Lives in the evidence layer alongside `summary` and
`description`, distinct from them in audience and rendering: those are
the public recruiter-facing copy, this is the tenant's private notes to
the agent.
_Avoid_: `narrative` (different scope, different layer), `caseStudy`,
`writeup`, `breakdown` (all imply a public surface), `notes`,
`comments` (no resume-generation signal).

## Output

**PDF renderer**:
The library that compiles portfolio data into a PDF byte stream
server-side. `pdfnative` core (no React wrapper), migrated from
`pdfnative-react`. Runs in the Hono server (`apps/server`). The
renderer is a pure engine concern — it has no knowledge of resume
semantics, only document structure (headings, paragraphs, lists, tables).
_Avoid_: PDF engine, document generator.

**Tagged PDF**:
A PDF with a `/StructTreeRoot` structure tree that assigns semantic
roles (`/H1`, `/P`, `/Table`, `/L`) to content. Required for reliable
ATS text extraction and screen-reader accessibility. Enabled via
`tagged: true` on the pdfnative `<Document>` component, which also
activates PDF/A-2b compliance.
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
workflow (profile, experiences, projects, stacks with selection and
portfolio inclusion defaults) before transactional Apply. Not persisted
server-side in v1.
_Avoid_: Import job, pending onboarding entity, server draft row.

**Resume import**:
The pipeline: session resume source → API text extract → Mastra
resume-import workflow → client review of resume import draft →
transactional apply into profile/evidence (with portfolio entries for
selected rows). Distinct from resume builder (generate).
_Avoid_: Resume parse service, CV sync, reverse resume builder.

## Stacks

**Stack**:
A named technology choice tracked in the `stack` table. Represents a
framework, language, library, tool, or service used across projects.
Linked to projects via the `project_stack` join table. Each stack has a
display `name` (customizable by the user), an optional `npmPackage`
(the raw npm package name for deduplication and auto-detection), a
`type` category, and an optional `icon`.
_Avoid_: Tech, technology, skill, dependency.

**Stack type**:
The `type` column on `stack`. One of `"framework" | "language" |
"database" | "ui" | "auth" | "deployment" | "testing" | "ai" |
"tooling" | "storage" | "other"`. Categorizes the stack for
filtering and display grouping. Assigned by the LLM during
auto-detection, editable by the user.
_Avoid_: Category, kind, group.

**npm package**:
The `npm_package` column on `stack`. The raw npm package name as it
appears in `package.json` (e.g., `"react"`, `"@tanstack/react-query"`).
Nullable — not every stack has an npm package (e.g., "REST API", "Docker").
Dedup and alias matching are **per tenant** (`userId`). Stack display
`name` is unique per `(userId, name)`.
_Avoid_: Package name, npm name, dependency name as a global unique.

**Detect-stacks workflow**:
A Mastra workflow (`detect-stacks-workflow`) that scans GitHub
repositories' `package.json` files to auto-detect tech stacks.
Triggered from the Project Form's "Detect Stacks" button. Four steps:
fetch-repo-package-jsons → extract-dependencies →
categorize-with-llm → deduplicate-and-format. Streams step progress
to the UI via oRPC for real-time `ShimmeringText` feedback. Includes
10 enhancements: auto-icon mapping, health metadata, confidence
scoring, stack aliases, usage frequency, stack diff, batch detection,
language aggregation, auto-descriptions, and portfolio tech section.
_Avoid_: Stack scanner, dependency detector, auto-stack.

**Stack alias**:
A row in `stack_alias` mapping an alternative npm package name to an
existing stack. Prevents duplicate stacks when multiple npm packages
represent the same technology (e.g., `react` and `react-dom` both
map to the "React" stack). Checked alongside `stack.npm_package`
during deduplication. Scoped with the parent stack’s tenant.
_Avoid_: Package alias, alternative name, npm alias.

**Stack health**:
Cached npm registry metadata stored in `stack.health_status`: whether
the package is deprecated, its weekly download count, and last publish
date. Refreshed on each detect-stacks scan. Displayed as badges in
the review dialog and on stack cards.
_Avoid_: Package health, npm status, dependency health.

**Stack confidence**:
The LLM's confidence level (`high | medium | low`) in its type
categorization of a dependency. Stored in `stack.confidence`. Low-
confidence items get a warning badge in the review dialog to surface
potential misclassifications.
_Avoid_: Classification confidence, categorization certainty.

**Stack scan**:
A row in `project_stack_scan` recording one detect-stacks workflow
execution for a project: the timestamp, detected npm package names,
and resulting stack IDs. Used to compute stack diffs on re-scan
(new/unchanged/removed packages).
_Avoid_: Detection scan, package scan, dependency scan.

**Language aggregation**:
The computed breakdown of programming languages across a project's
linked GitHub repositories. Derived from `GitHubUserRepoSummary.language`
weighted by repo relevance. Displayed on the project page as percentage
badges (e.g., "TypeScript 60%").
_Avoid_: Repo languages, language breakdown, tech breakdown.
