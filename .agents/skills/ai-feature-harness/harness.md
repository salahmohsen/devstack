# Harness recipes (tsu-stack)

Monorepo feedback loops for this product. Prefer these over inventing new boot sequences.

## Services

| Service        | Default                 | Start                                                 |
| -------------- | ----------------------- | ----------------------------------------------------- |
| Web            | `http://127.0.0.1:3000` | `pnpm --filter @tsu-stack/web dev` or root `pnpm dev` |
| API            | `http://127.0.0.1:5200` | `pnpm --filter @tsu-stack/server dev`                 |
| Agent (Mastra) | `http://127.0.0.1:4111` | `pnpm --filter @tsu-stack/agent dev`                  |
| Env            | `packages/env/.env`     | dotenvx via package scripts                           |

Quick health: `curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/ http://127.0.0.1:5200/auth/get-session http://127.0.0.1:4111/`

Agent down mid-workflow → restart agent; do not treat partial SSE as success.

## Auth session for oRPC / curl

Better Auth cookie: `better-auth.session_token=<token>.<hmac-sha256-base64(secret, token)>`

- Token: latest non-expired row in `session` for the tenant user
- Secret: `BETTER_AUTH_SECRET` from `packages/env/.env`
- HMAC: Node `createHmac("sha256", secret).update(token).digest("base64")`

```bash
# Sketch only — fill DATABASE_URL / BETTER_AUTH_SECRET from packages/env/.env
# SELECT token FROM session WHERE user_id = $USER AND expires_at > NOW() ORDER BY updated_at DESC LIMIT 1
# cookie = better-auth.session_token=${token}.${sig}
```

Never commit real cookies or tokens. Prefer user-provided session for browser; regenerate from DB only in local dev.

### Production (custom domain)

- Browser origin (`VITE_WEB_URL`, e.g. `https://hub.…`) is **not** the cookie jar for oRPC. Session is `__Secure-better-auth.session_token` on `VITE_SERVER_URL` (e.g. `https://api.…`).
- Playwright `addCookies` on the web host SSRs a signed-in shell and still 401s `/rpc/agent/listHubMessages`. Set the cookie on the API host (and decode `%2B` / `%3D` in the HMAC).
- Probe: `POST {VITE_SERVER_URL}/rpc/agent/listHubMessages` with `{ json: { page: 0 } }`. Compare `uiMessages[].parts` (`tool-*` vs `reasoning`+`text` only) to the painted thread.

### Prod logs (read yourself)

| Source                                                     | What it shows                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Axiom dataset `devhub`                                     | `environment=production`, `agent_hub_chat_stream_started`, `error.message`               |
| Dokploy apps `devhub-agent`, `devhub-web`, `devhub-server` | Deploy SHA in the title; `application-readLogs` for `Error in agent stream`              |
| Evlog `version`                                            | May lag the Dokploy SHA when `autoDeploy` is off — do not treat it as the running commit |

## GitHub (private repos / detect stacks)

- Private package.json reads need working OAuth on the session user (`account` provider `github`).
- `getSetupStatus` public RPC is **not** the private OAuth health check.
- Probe: authenticated `github/privateGetProfileRepos` or detectStacks stream past `fetch-repo-package-jsons`.
- `bad_refresh_token` / `missing_github_configuration` → user must reconnect GitHub in Settings; do not claim detect pass.

## oRPC calls

```text
POST http://127.0.0.1:5200/rpc/<router>/<procedure>
Content-Type: application/json
Cookie: better-auth.session_token=...
Body: {"json":{ ... input ... }}
```

Streaming workflows (detect/organize): `curl -N` SSE; parse `workflow-step-result` / `workflow-finish` / `error` events. Inspect **intermediate** steps (e.g. `programmatic-match` → `deduplicate-groups` → `format`) when final output drops rows.

## UI / browser

When the change is user-visible (dialogs, toasts, HITL cards, routing, lists):

1. Exercise the feature as a user (click/type/submit/navigate)
2. Visit **every** surface that shares state
3. Outside-click and Escape on AI result dialogs
4. Desktop + mobile if layout changed

If browser tools unavailable: API/curl + state asserts, and **state the gap** in the hardening report.

Product dialogs: coss **AlertDialog** (`AlertDialogContent` / Cancel / Action) — same as entity forms and settings dirty guards. Not `window.confirm`.

## Dual entry paths (common in this app)

| Feature         | Paths to always pair                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Detect stacks   | Projects list item menu **and** project form sheet                                               |
| Review detect   | Toast "Review" **and** re-open while status `ready`                                              |
| Organize stacks | Stacks page action → dialog wizard (review + portfolio)                                          |
| Hub tools       | Full Thread on `/dashboard` home **and** floater on other dashboard routes (when floater exists) |
| Applications    | New jobs / Tracked / agent propose card / invalidate hooks                                       |

## Agent / Mastra

- Load **mastra** skill before changing Mastra APIs.
- Register tools/workflows in `apps/agent/src/mastra/index.ts` when adding resources.
- Prefer unit tests for pure steps (package-families, merge rules) + one live stream smoke for the golden path.
- Soft AI failures: verify deterministic fallbacks (families, allowlists) still produce usable UI (confidence, icons, names).
- Chat/generate bodies must include `memory: { thread, resource }` from `hubChatMemoryOptions` — not top-level `threadId` / `resourceId`.
- Production probes (auth, secrets, tenant): [runtime-hardening.md](runtime-hardening.md).

### Fail-closed HTTP (local)

Public allowlist is health/OpenAPI only. Chat and generate must reject a missing session:

```bash
# Expect 401/403 — not a model invocation
curl -sS -o /tmp/agent-unauth.txt -w "%{http_code}\n" \
  -X POST http://127.0.0.1:4111/chat/hub-supervisor \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"ping"}]}]}'
```

Dashboard chat still goes through oRPC (`POST /rpc/agent/chatStream`) with the Better Auth cookie. API injects `Authorization: Bearer <session>` toward `:4111`.

### Read traces yourself

Do not ask the user to paste agent logs. Use:

| Source                                                      | What it shows                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Mastra Studio (agent `:4111` UI)                            | Tool calls, step results, memory on a turn                       |
| Agent process stdout (`pnpm --filter @tsu-stack/agent dev`) | Boot, auth, core-cache export errors                             |
| `@tsu-stack/logger` / evlog (API + agent jobs)              | `agent_hub_chat_*`, workflow outcomes. One `emit()` per lifetime |
| Browser → `agent.chatStream`                                | SSE / oRPC iterator; abort must cancel upstream                  |

Worker down mid-stream is not success. Restart with the package `dev` script (rebuilds `@tsu-stack/core` cache).

## Evidence to keep

- Command + exit code / key SSE events
- Before/after persisted state (project.stacks, stack_dependency, application stage)
- Screenshot or DOM assertion only when UI is in scope

Do not paste secrets into LESSONS.md or commits.
