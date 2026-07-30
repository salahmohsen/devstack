# BYO AI + Mastra Better Auth Implementation Plan

> **For agentic workers:** status of the BYO + auth cutover.

**Goal:** Per-user Settings AI keys power all Mastra LLM calls; agent HTTP uses Better Auth sessions (`MastraAuthBetterAuth`), not `AGENT_SERVICE_SECRET` or `DEEPSEEK_*` env.

**Architecture:**

1. Server resolves `user_ai_settings` → `RuntimeLlmConfig` (`openSecret`) → workflow `input.llm` or hub `requestContext`.
2. Agent steps call `agent.generate(..., { model: { id, apiKey } })`.
3. Server → agent uses `Authorization: Bearer <better-auth session token>` verified by `MastraAuthBetterAuth`.

---

## Done

- [x] Core `RuntimeLlmConfig` on classify, reply, detect-stacks, organize-stacks, resume-import
- [x] `resolveRuntimeAiCredentials` + classify/reply/stacks/resume/hub wiring
- [x] Agent BYO-only (`resolveGenerateModel` / `generateModelOption` / `byoModelFromRequestContext`)
- [x] `@mastra/auth-better-auth` + shared `@tsu-stack/auth` on agent
- [x] Remove `AGENT_SERVICE_SECRET` from code, compose, local env
- [x] Remove `DEEPSEEK_API_KEY` from local env / compose / agent gates
- [x] Dual DB for agent: app DB (`DATABASE_URL`) for sessions + `MASTRA_DATABASE_URL` for Mastra storage

## Ops after deploy

1. Redeploy so agent has `BETTER_AUTH_SECRET`, `VITE_WEB_URL`, `VITE_SERVER_URL`, app `POSTGRES_DB`, `MASTRA_POSTGRES_DB=mastra_agent`.
2. User must have an **active Better Auth session** (queue jobs look up latest non-expired session token).
3. User must configure **Settings → AI** provider key + feature models.
4. Confirm Dokploy env has no `DEEPSEEK_API_KEY` / `AGENT_SERVICE_SECRET`.

## Fallback order (product)

1. BYO key + model from settings
2. Heuristic / skip LLM with `llm:missing_byo_*` note

No env provider keys.
