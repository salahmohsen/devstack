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
The Mastra per-resource string cache (markdown) that mirrors the current
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
The LLM-driven Mastra agent that powers the dashboard chat and the
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

**Refresh-identity workflow**:
The deterministic gather → diff → write pipeline that runs in response
to GitHub webhooks and scheduled jobs. Calls the identity agent inside its
`diff-facets.step.ts`. Writes go through `identityRepository.writeFacet`
or `identityRepository.createProposal` depending on the confidence
threshold. Persists snapshots in D1 via `D1Store`.
_Avoid_: Sync job, update pipeline.

**Refresh run**:
A single execution of the refresh-identity workflow. One per webhook
delivery (deduped by delivery ID) or per cron tick. Tracked in Mastra's
`mastra_workflow_snapshot` table in D1.
_Avoid_: Sync attempt, job, invocation.

**Gather step**:
The first step of the refresh workflow. Reads each configured repo's
README, agent docs, and recent commits using the existing GitHub cache
(`getRepoFileContent` from `@tsu-stack/github`). Stateless — no
intermediate table; the concatenated output is the step's return value.
_Avoid_: Ingest, fetch step.

**Diff step**:
The second step. Calls `identityAgent.generate()` with the gathered
contexts and the current identity, receives a structured proposal (Zod
schema), and decides per-facet whether to auto-write or to enqueue a
proposal based on the confidence threshold.
_Avoid_: Compare, analyze step.

**Write step**:
The third step. For each proposal above the threshold, calls
`identityRepository.writeFacet(...)`. For each below, calls
`identityRepository.createProposal(...)`. Triggers the working-memory
refresh on every successful write.
_Avoid_: Persist, apply step.

**Reindex step**:
The fourth and final step. Re-embeds any facet whose value changed in
this run into the `identity_facet_vectors` pgvector index.
_Avoid_: Embed, vectorize step.

## Storage

**Mastra memory store**:
Cloudflare D1 via `@mastra/cloudflare-d1`'s `D1Store`. Holds
`mastra_threads`, `mastra_messages`, `mastra_workflow_snapshot`, and the
other `mastra_*` tables that Mastra manages automatically. Separate
from the transactional Postgres pool.
_Avoid_: Chat storage, conversation log.

**Identity vector store**:
A pgvector index (`identity_facet_vectors`) in the existing Neon
database, dimension 1536 (OpenAI `text-embedding-3-small`), HNSW index
with cosine distance. Maintained by the reindex step; not by Mastra.
_Avoid_: Embeddings table, semantic index.

**Delivery ID cache**:
A 7-day TTL entry in `GITHUB_CACHE_KV` keyed by the GitHub webhook's
`X-GitHub-Delivery` header. Prevents duplicate workflow runs when GitHub
redelivers an event.
_Avoid_: Webhook dedup, idempotency cache.

## Request flow

**Request context**:
The Mastra per-call context object that carries values that vary per
request: the user session, the request-scoped logger, the request ID, and
the resource ID (the portfolio owner's user ID). Passed as
`requestContext` to every `agent.generate()`, `run.start()`, and
`tool.execute()` call from the Hono handler.
_Avoid_: Request scope, context bag, locals.
