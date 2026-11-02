# Job pipeline MCP

Date: 2026-11-02. Status: design approved in chat, spec pending review.

## Goal

Control the whole job pipeline (discover, triage, apply, outreach, mail, profile data) from an MCP client such as Claude Code, instead of the website. Works for the signed-in user only.

## Decisions

| Topic        | Decision                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transport    | Remote streamable HTTP MCP at `/mcp`, mounted on the Hono app in `apps/server/src/app.ts`. Stateless.                                                                                 |
| Auth         | Better Auth `apiKey` plugin. Key minted in Settings under "MCP access". `Authorization: Bearer <key>` resolves to `userId` and builds the same oRPC context as a web session.         |
| Tool backing | In-process oRPC router client over `appRouter`. No HTTP hop. Same middleware and tenant scoping as the website. Mastra hub tools are not reused, since most are client-enqueue stubs. |
| Send safety  | Two-step confirm for `outbound` and `destructive` tools.                                                                                                                              |
| Scope        | Pipeline plus profile data, about 55 tools.                                                                                                                                           |

## Architecture

New package `packages/mcp` owns three things.

1. **Registry.** Curated allowlist of `{ name, procedurePath, effect }`. `effect` is `read | write | outbound | destructive`. It sets MCP `readOnlyHint` and `destructiveHint`. Input schemas come from the oRPC zod contracts. Names look like `applications_update_stage`.
2. **Confirm gate.** One wrapper in the registry. A tool cannot bypass it.
3. **Auth bridge.** Bearer key to `userId` to oRPC context.

`apps/server` imports the package and mounts the route. No business logic in the MCP layer.

### Included routers

`jobDiscovery`, `applications`, `mail`, `notifications`, `jobPreference`, `experiences`, `educations`, `certifications`, `projects`, `stacks`, `resume`, `search`.

### Excluded routers

`admin`, `aiSettings`, `connections`, `domain`, `github`, `signupPolicy`, `onboarding`, `portfolio`, `profile`, `agent`.

## Confirm gate

Applies to `outbound` and `destructive`: `applications.sendOutreach`, `mail.sendReply`, `applications.acceptApplyPackage`, and every `delete*` procedure.

- First call returns `{ preview, confirmToken }`. Nothing executes.
- `confirmToken` is a stateless HMAC over `userId + tool + hash(input) + expiry`. TTL 5 minutes. Secret derived from `BETTER_AUTH_SECRET`.
- Second call with the same tool, same input, and the token executes.
- Changed input, wrong user, or expired token returns an error and executes nothing.

## Async tools

`jobDiscovery.findNow` and `applications.generateApplyPackage` enqueue and return the enqueue result. Follow-up uses `notifications_list` and `applications_list_new`. Same behavior as the hub.

## Errors

`ORPCError` maps to an MCP `isError` result carrying code and message. Nothing throws through the transport.

## Verification

- Registry test. Every allowlisted path exists in `appRouter`. Every non-read tool has the right `effect`.
- Confirm gate test. Missing token, tampered input, and expired token all block.
- Real run on local dev with an MCP client. Read a list, move a stage, attempt a send and confirm it requires the token.
- `AGENTS.md` says tests only when asked. These two are included because the gate is safety-critical.

## Open items for the plan

- Read `createContext` in `packages/api/src/lib/context/hono/create-context.ts` to confirm a key-backed user slots in.
- Confirm the `apiKey` plugin version fits `better-auth ^1.6.23`.
- Settings UI for minting and revoking keys. Follow `.agents/ui.md`, `.agents/auth.md`, and `.agents/end-to-end-features.md`.
- Check whether `generateApplyPackage` runs long enough to need a polling tool.
- Add the `@modelcontextprotocol/sdk` dependency to `packages/mcp`.
