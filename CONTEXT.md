# Portfolio AI Context

A glossary of terms specific to the AI / identity / agent layer of the
portfolio. General programming terms (workflow, tool, vector, etc.) do not
belong here even if the project uses them heavily.

## Identity

**Facet**:
A typed, named slice of the portfolio owner's _self-description_ — content
the user owns and the public site displays. One row per facet in
`portfolio_identity_facets`, validated by the Zod schema registered under its
key in `packages/core/src/identity/schemas.ts`. Every write creates an
immutable revision in `portfolio_identity_revisions`. Voice and other
agent-behavior rules are _not_ facets (see `Voice` below).
_Avoid_: Section, field, property, setting.

**Headline**:
The `headline` facet. The user's recruiter-facing one-liner plus a list of
value props. Stored as `{ oneLiner: string, valueProps: string[] }`. The
"positioning" of the user's professional identity.
_Avoid_: Tagline, motto, pitch (overloaded), elevator pitch (too narrow).

**Bio**:
The `bio` facet. The user's bio in two lengths: `short` (≤160 chars, for
social cards and meta descriptions) and `long` (full paragraph for the
"About" page).
_Avoid_: About, description.

**Focus log**:
The `focus_log` facet. A reverse-chronological list of what the user has
worked on or is working on. Items are `{ title, body, startedAt }`. The
dashboard shows the last 3 by default with a "see full history" toggle. The
name is a _log_, not a "current focus" — items are not filtered to the
present; they accumulate.
_Avoid_: Current focus, projects-in-progress, focus list.

**Narrative**:
The `narrative` facet. A single markdown string (≤500 words) describing the
user's career arc in first person. The agent's primary tool for answering
"why does this project matter for _this_ user" questions. Powers the future
resume-generation feature.
_Avoid_: Story, about-me long, manifesto.

**Identity**:
The full set of all current facet rows. The single source of truth for
self-description. A singleton owned by the portfolio owner (gated by auth,
not per-tenant). Distinct from `project` and `experience`, which are the
_evidence_ layer; identity is the _narrative_ layer on top of that
evidence.
_Avoid_: Profile, user data, portfolio content.

**Voice**:
A peer of identity, but lives outside the facets table. A set of behavioral
rules (tone, dos, don'ts) consumed only by the agent's `instructions`
string, not displayed on the public site. Stored at
`packages/core/src/voice/schema.ts`, edited through a separate dashboard
surface. Splitting it from identity avoids conflating "the user changed
their bio" with "the agent was told to sound more casual" in the audit
trail.
_Avoid_: Style guide, brand voice, tone doc, writing rules.

**Revision**:
An immutable row in `portfolio_identity_revisions` recording one
`writeFacet` call: the value written, the source that produced it, and a
human-readable reason. Append-only; never updated or deleted.
_Avoid_: Version, snapshot, history entry.

**Proposal**:
A queued change to a facet that the refresh workflow declined to apply
automatically because the diff step's confidence was below the ratcheting
threshold. Lives in `portfolio_identity_proposals`. The user accepts or
rejects from the dashboard. Accepting calls `writeFacet` and creates a
revision; rejecting just marks the proposal resolved.
_Avoid_: Draft, suggestion, pending change.

**Working memory**:
The per-resource string cache (markdown) that mirrors the current
identity, used so the LLM sees fresh identity context at the start of every
thread without paying a tool call. Never written by the agent directly —
always re-rendered from the Drizzle facet rows by the bridge in
`packages/ai/src/lib/bridge.ts`.
_Avoid_: System prompt, agent context, memory.

**Working-memory refresh**:
Three triggers, all funneled through the same
`renderIdentityToWorkingMemory(resourceId)` helper: (1) after every
successful `writeFacet`, (2) at the start of a new conversation if the
cached working memory is older than the most recent facet write, (3) never
inside an in-flight agent loop.
_Avoid_: Memory sync, cache invalidation.

## Sources

**Identity source**:
The provenance of a facet write. One of `"github" | "manual" | "conversation" | "seed"`.
Recorded in the `source` column of both the facet and the revision row, plus
`source_ref` (the commit SHA, conversation ID, or null) for traceability.
_Avoid_: Origin, cause, author.

**Source ref**:
The opaque pointer to whatever produced the write — a commit SHA for
GitHub writes, a workflow run ID for agent writes, a conversation ID for
chat writes, or null for manual/seed. Combined with `(facet_key, source)`
to enforce idempotency.
_Avoid_: Reference, pointer, ID.

## Agents vs Workflows

**Portfolio agent**:
The LLM-driven agent that powers the dashboard chat and the
"suggest better content" buttons. Streaming-first. Tools it can call
include `getIdentity`, `searchIdentity`, `updateIdentityFacet`, and the
GitHub data tools.
_Avoid_: The bot, the AI, the assistant.

**Identity agent**:
The inner LLM-driven agent used by the `refreshIdentityWorkflow` to
propose facet changes from raw inputs (READMEs, AGENTS.md, .cursorrules,
recent commits). Not exposed to the dashboard. Has read-only identity
tools; never writes directly.
_Avoid_: Refresher, updater.

**Delivery ID cache**:
A 7-day TTL entry in `GITHUB_CACHE_KV` keyed by the GitHub webhook's
`X-GitHub-Delivery` header. Prevents duplicate processing when GitHub
redelivers an event.
_Avoid_: Webhook dedup, idempotency cache.

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
