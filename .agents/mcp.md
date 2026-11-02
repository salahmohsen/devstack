# MCP server

Remote MCP at `/mcp`, implemented in `packages/mcp`, mounted in `apps/server/src/app.ts`.

- Auth: Better Auth `apiKey` plugin. Send `x-api-key`. A guard in `app.ts` rejects keys on every path except `/mcp`. Keys are rate limited to 120 requests per minute in `packages/auth/src/auth.ts`.
- Keys are minted in Settings under MCP access (`apps/web/src/pages/dashboard/settings/ui/mcp-settings.tsx`).
- Adding a tool: add one line to `TOOLS` in `packages/mcp/src/registry.ts` with the right `effect`. The server asserts every path exists in `appRouter` at boot.
- Effects: `read`, `write`, `outbound` (emails a person), `destructive` (deletes). `outbound` and `destructive` are gated by a confirm token, see `confirm.ts`. Never skip the gate for a send.
- Input schemas come from the procedure's zod input via `@orpc/zod`. Top-level `.and()` inputs are flattened. A top-level union falls back to a permissive object schema, so prefer object inputs on MCP-exposed procedures.
- Excluded on purpose: admin, auth settings, connections, domain, github, signup policy, onboarding, public portfolio, agent.
- Tools call the same oRPC procedures as the website, so tenant scoping is unchanged. Do not add business logic in the MCP layer.
- Local check without the UI: seed a user row, mint a key with `auth.api.createApiKey({ body: { userId } })`, then POST JSON-RPC to `/mcp` with `content-type: application/json` and `accept: application/json, text/event-stream`.
