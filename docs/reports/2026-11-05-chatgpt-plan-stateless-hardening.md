# ChatGPT-plan stateless history hardening

## Contract

ChatGPT-plan follow-up turns must send complete usable history without referencing provider items that were never stored. Streaming hub chat and non-streaming workflow generation share `chatgptPlanLanguageModel`; the fix belongs at that model boundary. Existing text and function call/result pairs must survive, and caller-owned prompts/options must remain unchanged.

## Evidence and feedback loop

- Production agent logs confirmed the reported missing reasoning item at 2026-11-05 06:01:52 UTC, with HTTP 404 and `invalid_request_error` on `input`.
- Controlled execution against the installed OpenAI SDK reproduced the mismatch: default SDK options serialized reasoning as `item_reference`, while the fetch adapter subsequently forced `store: false`.
- The model now applies `store: false`, requests `reasoning.encrypted_content`, and clears server conversation/previous-response options before SDK conversion. Both `doGenerate` and `doStream` use the same normalization.
- History normalization omits reasoning without a nonempty encrypted payload. It preserves encrypted reasoning, assistant text, and tool call/result pairs without mutating the original input. No persisted messages are edited.
- The regression loop captures actual outgoing SDK requests for generation and streaming. It covers conflicting caller options, legacy reasoning IDs, empty encrypted payloads, encrypted reasoning replay, full function call/result payloads, preserved caller settings, and input immutability. The existing first-turn check also verifies encrypted-content inclusion. All four history regression cases fail against the original implementation; ordinary follow-up cases fail on unexpected item references.

## Validation

- `vp test run src/mastra/lib/chatgpt-plan-model.test.ts` from `apps/agent`: 12 tests passed, including the existing actual Mastra apply-package generation check.
- Package-local `vp check`: passed with existing warnings.
- `vp run -w fix`: passed across 1,791 files with zero errors and 113 existing warnings. Staged package typechecks also passed.
- `vp run build` from `apps/agent`: passed using dependencies installed in the isolated checkout. An initial attempt with symlinked dependencies failed workspace path resolution; an offline frozen-lockfile install resolved that checkout setup issue.

## Runtime scope and gaps

- The change adds no routes, tools, memory resources, credentials, logs, or database writes. Request-scoped model instances retain the supplied access token and user ID; normalization does not share state between callers.
- Static inspection confirms session-only agent authentication and session-owned `mapUserToResourceId` remain unchanged. No provider environment key was introduced.
- A local unauthenticated HTTP probe could not connect because no agent was listening on port 4111. Live auth/tenant probes were not run, and no claim of fresh runtime isolation verification is made.
- Provider traffic in the regression loop is stubbed. An authenticated production follow-up after deployment remains necessary to verify live recovery. No UI behavior changed or browser verification was performed.
- Durable lesson added to `.agents/skills/ai-feature-harness/LESSONS.md`: configure stateless Responses before SDK serialization.
