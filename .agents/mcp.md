# MCP server

Remote MCP at `/mcp`, implemented in `packages/mcp`, mounted in `apps/server/src/app.ts`.

- Auth: Better Auth `apiKey` plugin. Send `x-api-key`. A guard in `app.ts` rejects keys on every path except `/mcp`.
- Responses: `401 INVALID_API_KEY` for a missing or bad key, `429 RATE_LIMITED` with `Retry-After` when over the limit, `503 AUTH_UNAVAILABLE` when auth itself fails. Never report a rate limit or outage as a bad key.
- Rate limit: the plugin limiter is off (`rateLimit.enabled: false` in `packages/auth/src/auth.ts`) because it only resets after a full idle window, so a busy session locks itself out. `/mcp` uses `createRateLimiter` from `packages/mcp` instead: a fixed window of 600 requests per minute per user, held in memory, so with several server instances the effective limit is per instance.
- The `/mcp` route resolves the session once and passes it to `createContext`. Key-authenticated requests skip the GitHub OAuth token lookup because that call re-verified the key.
- Keys are minted in Settings under MCP access (`apps/web/src/pages/dashboard/settings/ui/mcp-settings.tsx`).
- Adding a tool: add one line to `TOOLS` in `packages/mcp/src/registry.ts` with the right `effect`. The server asserts every path exists in `appRouter` at boot.
- Effects: `read`, `write`, `outbound` (emails a person), `destructive` (deletes). `outbound` and `destructive` are gated by a confirm token, see `confirm.ts`. Never skip the gate for a send.
- Input schemas come from the procedure's zod input via `@orpc/zod`. Top-level `.and()` inputs are flattened. A top-level union falls back to a permissive object schema, so prefer object inputs on MCP-exposed procedures.
- Covered: pipeline and profile data, plus profile, contact, AI settings, mail settings and smart rules, notification settings, portfolio visibility, custom domain, connection status and Gmail sync, a read-only set of private GitHub reads, onboarding status and skip, and the stack detect and organize workflows.
- Excluded on purpose: platform admin (other users' data), signup policy, the streaming hub chat, GitHub and Gmail OAuth connect (needs a browser), onboarding extract and apply (need an uploaded source), and the public GitHub and portfolio reads.
- Secrets: `aiSettings.update` and `mailSettings.update` take provider keys as arguments, so those values pass through the MCP client. Prefer rotating them in Settings if the client keeps transcripts.
- `profile.update` replaces name and email, so read `profile.get` first and resend them. `summary` and `contacts` are left unchanged when omitted.
- Tools call the same oRPC procedures as the website, so tenant scoping is unchanged. Do not add business logic in the MCP layer.
- Local check without the UI: seed a user row, mint a key with `auth.api.createApiKey({ body: { userId } })`, then POST JSON-RPC to `/mcp` with `content-type: application/json` and `accept: application/json, text/event-stream`.
