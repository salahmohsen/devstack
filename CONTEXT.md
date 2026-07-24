# Portfolio Context

A glossary of terms specific to the portfolio's evidence, output, stack, and
cache-invalidation layers. General programming terms (workflow, tool, vector,
etc.) do not belong here even if the project uses them heavily.

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
A Cloudflare Durable Object (binding `GITHUB_SIGNAL_RELAY`) that fans
out recently-bumped signal keys to connected WebSocket clients. Uses
the WebSocket Hibernation API so per-socket subscription state survives
isolate restarts (see `0012-signal-relay-durable-hibernation`); clients
that miss a broadcast reconcile against the durable signal rows via the
`getRevalidationSignals` oRPC route, called from
`use-github-signal-stream.ts` on WebSocket open, `visibilitychange`,
`window focus`, `online`, and a 20s polling fallback when disconnected.
_Avoid_: WebSocket hub, pub/sub relay.

**Delivery ID cache**:
A row in `github_webhook_event` keyed by the GitHub webhook's
`X-GitHub-Delivery` header. Prevents duplicate processing when GitHub
redelivers an event. Persisted in Postgres (not the Cloudflare KV
binding), so the dedup state survives across worker restarts without a
7-day TTL — old rows are pruned by a separate retention job.
_Avoid_: Webhook dedup, idempotency cache.

## Evidence

**Portfolio entry**:
A row in `portfolio_entry` representing one evidence item
(experience, project, stack, or contact) that the owner has opted to
expose to the public portfolio surface and to AI agents. Acts as a
visibility gate — the row's existence, not a boolean column on the
entity, is what makes the item visible. The owning entity holds a
nullable `portfolio_entry_id` FK. Created and removed synchronously
with the entity's own create/update/toggle operations, inside the same
database transaction, so the FK and the portfolio*entry row are always
consistent.
\_Avoid*: Inclusion flag, visibility toggle, AI flag, include-in-portfolio.

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
the public recruiter-facing copy, this is the owner's private notes to
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

## Stacks

**Stack**:
A named technology choice tracked in the `stack` table. Represents a
framework, language, library, tool, or service used across projects.
Linked to projects via the `project_stack` join table. Each stack has a
display `name` (customizable by the user), an optional `npmPackage`
(the raw npm package name for deduplication and auto-detection), a
`type` category, and an optional `icon`.
\_Avably: Tech, technology, skill, dependency.

**Stack type**:
The `type` column on `stack`. One of `"framework" | "language" |
"database" | "ui" | "auth" | "deployment" | "testing" | "ai" |
"tooling" | "storage" | "other"`. Categorizes the stack for
filtering and display grouping. Assigned by the LLM during
auto-detection, editable by the user.
\_Avably: Category, kind, group.

**npm package**:
The `npm_package` column on `stack`. The raw npm package name as it
appears in `package.json` (e.g., `"react"`, `"@tanstack/react-query"`).
Nullable — not every stack has an npm package (e.g., "REST API", "Docker").
Used as the deduplication key: one npm package maps to at most one stack.
Filled automatically by the detect-stacks workflow; optional in the
manual stack form.
\_Avably: Package name, npm name, dependency name.

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
\_Avably: Stack scanner, dependency detector, auto-stack.

**Stack alias**:
A row in `stack_alias` mapping an alternative npm package name to an
existing stack. Prevents duplicate stacks when multiple npm packages
represent the same technology (e.g., `react` and `react-dom` both
map to the "React" stack). Checked alongside `stack.npm_package`
during deduplication.
\_Avably: Package alias, alternative name, npm alias.

**Stack health**:
Cached npm registry metadata stored in `stack.health_status`: whether
the package is deprecated, its weekly download count, and last publish
date. Refreshed on each detect-stacks scan. Displayed as badges in
the review dialog and on stack cards.
\_Avably: Package health, npm status, dependency health.

**Stack confidence**:
The LLM's confidence level (`high | medium | low`) in its type
categorization of a dependency. Stored in `stack.confidence`. Low-
confidence items get a warning badge in the review dialog to surface
potential misclassifications.
\_Avably: Classification confidence, categorization certainty.

**Stack scan**:
A row in `project_stack_scan` recording one detect-stacks workflow
execution for a project: the timestamp, detected npm package names,
and resulting stack IDs. Used to compute stack diffs on re-scan
(new/unchanged/removed packages).
\_Avably: Detection scan, package scan, dependency scan.

**Language aggregation**:
The computed breakdown of programming languages across a project's
linked GitHub repositories. Derived from `GitHubUserRepoSummary.language`
weighted by repo relevance. Displayed on the project page as percentage
badges (e.g., "TypeScript 60%").
\_Avably: Repo languages, language breakdown, tech breakdown.
