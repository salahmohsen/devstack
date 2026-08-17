# Agent runtime readiness (this stack)

Portable production checks from AgentCore-style harden/debug/optimize skills, rewritten for **Mastra in `apps/agent`**. Product UI / HITL / dual-entry still lives in [SKILL.md](SKILL.md) + [checklists.md](checklists.md).

**Do not** install AWS AgentCore plugins, run `agentcore`, or look for `agentcore.json`. Those skills assume Bedrock IAM, JWT authorizers, Secrets Manager, Gateway, X-Ray, and microVM session quotas. This repo is session-only Better Auth, BYO LLM, oRPC, and `@tsu-stack/logger`.

Stack rules that this file **checks** (do not restate them here): [apps/agent/AGENTS.md](../../../apps/agent/AGENTS.md). How to probe: [harness.md](harness.md).

## When to run

Any hardening run that touches hub chat, Mastra HTTP, tools, memory, BYO credentials, or agent auth. Skip explicitly in the report when the change is UI-only with no agent process change.

## Translate, do not copy

| AgentCore idea                               | Do this instead                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| IAM / Bedrock / ECR scope                    | No Bedrock runtime. Scope is BYO key from Settings → AI + `CHAT_ALLOWED_AGENT_IDS`                                |
| SigV4 / IdP JWT / `--authorizer-type NONE`   | `MastraAuthBetterAuth` + API `protectedProcedure`. Agent HTTP without a session must fail closed                  |
| `agentcore add credential` / Secrets Manager | BYO in `requestContext` / workflow `input.llm`. No provider API keys in agent env                                 |
| Gateway targets vs raw HTTP                  | Mastra `createTool` + API oRPC. Do not add a tool that `fetch`es with a secret from `process.env`                 |
| X-Ray / CloudWatch / `agentcore traces`      | Read Mastra Studio, `:4111` process logs, and `@tsu-stack/logger` / evlog yourself                                |
| `agentcore run eval` / Builtin.Helpfulness   | Mastra `createScorer` + explicit `sampling` on the instance. Unit tests at a real seam                            |
| `StopRuntimeSession` / `maxVms` / idle VM    | One hub thread per user (`hubChatThreadId`). Pass `memory: { thread, resource }` — never a new thread per message |
| Cedar / Gateway policy                       | Tool allowlists, HITL `requireToolApproval`, processors. Not a Cedar engine                                       |

## Checklist

Run the items that match the change. Cite evidence (status code, log line, test name) in the hardening report.

### Inbound auth

- [ ] Unauthenticated `POST` to agent `/chat/:agentId` and `/api/agents/:id/generate` is **401/403**, not a model call
- [ ] Public allowlist stays health/OpenAPI only (`session-auth` / `Mastra` `public:` routes)
- [ ] Dashboard chat goes through oRPC `agent.chat` / `agent.chatStream` (`protectedProcedure`). API forwards `Authorization: Bearer <session>`
- [ ] `:4111` is not published without auth (compose / deploy / tunnel)

### Secrets

- [ ] No hardcoded `sk-` / `api_key =` in `apps/agent`
- [ ] No `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `OPENCODE_API_KEY` required for hub chat — BYO only
- [ ] Logs and `LESSONS.md` never contain session tokens, BYO keys, or cookie values
- [ ] Tools do not read provider keys from `process.env`

### Input validation

- [ ] Every `createTool` has a Zod input schema; empty `{}` cannot smash get-by-id tools
- [ ] Chat / generate payloads cap array length and string size (token-bomb). `uiMessagesSchema` already caps count — check per-message length when adding routes
- [ ] User-supplied ids (`applicationId`, `thread`, `resource`) match expected format; client cannot set `resourceId` (auth `mapUserToResourceId` owns it)

### Errors

- [ ] Caller sees a product error (Settings BYO missing, session expired), not a stack trace or raw provider dump
- [ ] Tool / model / worker-down paths are handled; do not swallow with empty `catch`

### Tenant + memory

- [ ] `memory.resource` is the session user id; `memory.thread` is `hubChatThreadId(userId)` (or the documented per-flow thread)
- [ ] Bodies use `memory: { thread, resource }`, not top-level `threadId` / `resourceId`
- [ ] Prompts, Memory, and few-shot never include another user's data
- [ ] Foreign session cannot read or continue this user's hub thread

### Tools + long work

- [ ] New outbound HTTP in agent code has a reason to exist (streaming, not a secret). Prefer an existing oRPC procedure
- [ ] Multi-step jobs are workflows + `startAsync()`, not fire-and-forget inside `/chat`
- [ ] HITL tools stay client-side (`requireToolApproval` / no `execute`) when the product card is the write

### Observability + quality

- [ ] You **read** Studio / `:4111` / evlog for the failing turn. Do not ask the user to paste logs
- [ ] Wide events use `@tsu-stack/logger` (no direct `evlog` from the agent app). One `emit()` per lifetime
- [ ] If this flow has a scorer, it is registered with explicit `sampling`. Do not add AgentCore online-eval
- [ ] Error cases exercised: tool failure, missing BYO, expired session, worker down

### Init

- [ ] After new `@tsu-stack/core` exports: `pnpm --filter @tsu-stack/agent rebuild:core-cache` (or the package `dev` script)
- [ ] No heavy model/DB/MCP init at module import on the request path

## Debug (read, do not wait)

| Symptom                       | Look here first                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| 401 / "not authorized" on hub | Session cookie vs `127.0.0.1`/`localhost`; API `protectedProcedure`; agent `public:` allowlist |
| `threadId "undefined"`        | Body missing `memory: { thread, resource }` (`hubChatMemoryOptions`)                           |
| Tool called with `{}`         | Schema + list-before-get; empty HITL args (see LESSONS)                                        |
| "AI temporarily unavailable"  | Core ESM cache stale; restart package `dev`                                                    |
| Wrong user's memories / brief | `mapUserToResourceId` vs client-supplied resource; thread id formula                           |
| Stream dies mid-tool          | API abort signal forwarded; workflow `startAsync` vs chat timeout                              |
| Model / BYO errors            | Settings key present; `resolveRuntimeAiCredentials`; product error not raw dump                |

**REQUIRED BACKGROUND** for hard bugs: diagnose / superpowers:systematic-debugging. Still read logs yourself.
