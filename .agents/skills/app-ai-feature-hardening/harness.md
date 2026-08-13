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

## Evidence to keep

- Command + exit code / key SSE events
- Before/after persisted state (project.stacks, stack_dependency, application stage)
- Screenshot or DOM assertion only when UI is in scope

Do not paste secrets into LESSONS.md or commits.
