# Apply package and chat profile investigation

## Contract

Package generation must preserve structured rewrites returned by the model. Job proposals must assess the signed-in user's saved career evidence, keep unsupported requirements explicit, and avoid invented provisional scores. Saving a confirmed URL must create or find its application without a runtime initialization error.

Entry paths include dashboard package generation, hub package generation, regenerated agent takes, and hub listing proposals and confirmed saves. They share the Responses adapter, the apply-package workflow, the application data, and the authenticated user's portfolio. Browser layout and production rollout are outside this local verification.

## Production evidence

Read Dokploy logs for the running agent, API server, and web containers on 2026-11-04. Agent and API logs show both experience and project rewrite failures with empty structured output. The API identifies the provider as `chatgpt-plan/gpt-6.1-sol`. An earlier regenerated agent take finished with `stop`, 120 output tokens, zero reasoning tokens, and empty text. This makes a reasoning-budget explanation insufficient for that take.

The agent also records OpenAI HTTP 400 `invalid_json_schema` for skill linking because `stackId` was declared but missing from `required`. The inspected web log window contained no matching errors. An API `previewListing` request with undefined input was also present; the current query builder supplies an input object, so its origin is not established and no speculative change was made.

The raw production provider stream was unavailable. A controlled stream reproduces a compatible loss mechanism: `response.output_item.done` contains the answer, but `response.completed.output` is empty. The old adapter discards the answer and the installed SDK returns an empty content array. This is a reproduced adapter defect consistent with the production symptom, not proof that production sent precisely those events.

## Changes

- Preserve completed SSE output items, in output-index order, when the terminal response has no output. Keep an existing terminal output authoritative. Streaming callers keep the original stream.
- Pass a fresh profile snapshot with bounded text from the authenticated API context into the hub before the listing-import tool restriction. Include dated experience, projects, skills, and preferences. Ground scores and takes in that evidence; use null when evidence is insufficient.
- Make the API skill-link schema compatible with strict native output, and disable extractor tools for the already-supplied job text. The agent-side loose skill schema uses inline injection with validation.
- Fix confirmed URL saves reading the outer `created` binding before its initialization. New and existing tracked rows, plus promotion from inbox, are covered.
- Abort timed-out chunk generation and clear the timer after completion. Empty-output diagnostics now include finish reason and token counts without copying model prose.

## Verification

The controlled SSE regression failed before the adapter fix with `expected [] to deep equally contain ObjectContaining`. After the change it passes through the actual AI SDK Responses model and the actual Mastra apply-package agent, ending with a schema-validated rewrite chunk.

Final targeted runs passed 104 tests across six agent files and four tests across two API files. They cover existing structured payload extraction, timeout cancellation, hub tool restrictions and prompt behavior, session-scoped profile reads, empty profiles, URL creation/deduplication/promotion, and skill payload sanitation. A read-only local PostgreSQL probe loaded a profile snapshot successfully; its selected fixture account had an empty portfolio.

Package-local agent and API checks passed with existing warnings. Agent and API server production builds passed. The required workspace `vp run -w fix` failed after scanning nested historical `.claude/worktrees` and reporting 276 errors and 336 warnings; unrelated worktree findings were not expanded into this task.

## Runtime boundaries and gaps

The new profile loader derives identity from the authenticated session for both chat entry paths. Its tests assert that every repository read uses that identity. No client-supplied user ID or new tool/auth endpoint was added, and the existing client confirmation gate remains in place. A fake-timer check proves timeout cancellation reaches the provider signal.

No authenticated production regeneration, new production save, browser flow, or persisted full-package result was verified. The local saved provider key rejected the attempted live-provider probe with HTTP 401; no successful paid-provider execution is claimed. Agent HTTP authentication and cross-session memory were not re-probed. The production worker has no public application domain in Dokploy.

No deployment or production data mutation was performed. Lessons were appended to the AI feature harness living lessons file.

## PR review follow-up

Preserve null proposal scores through listing preview merging and the saved-application payload. Existing deterministic score caps still apply to scored proposals. Include every saved experience in the supplied profile, and degrade to an explicit unavailable-profile signal if any profile read fails so chat remains usable without stale evidence. Strengthen processor registration and stream output-order assertions.

URL creation now accepts optional activity data in the repository and commits the application plus its discovery activity atomically. The local-only `packages/db/scripts/harness-application-discovery.ts` proves rollback when the activity actor violates its foreign key, concurrent URL deduplication, and exactly one discovery activity with the correct application, actor, and kind. Fixture records are cleaned up. The agent tests verify the submitted details are merged on promotion.

Fresh review validation passed 106 agent tests, nine API tests, and 11 web proposal tests. The changed-file check passed with an existing warning; agent and API server builds passed after rebuilding the agent's database cache.

The review's separate performance follow-up proposes replacing full portfolio repository reads with database projections, counts, and aggregates. This remains a separate optimization: the current fix preserves all dated career evidence and reuses the existing overlapping-date calculation. Adding a new read contract and duplicate SQL date semantics without a performance baseline would expand this correctness patch. No query-performance improvement is claimed.
