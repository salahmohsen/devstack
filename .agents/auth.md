# Auth Patterns

## Architecture

- **Server**: Better Auth handles `/auth/*` on the Hono server (`apps/server`)
- **Client**: `authClient` from `@tsu-stack/auth` (nanostore-based, client-side only)
- **SSR**: `$getUser` server function resolves session from request headers, forwards `Set-Cookie` for refresh
- **Cookies**: Prefer Better Auth defaults for reusable projects — `SameSite=Lax` supports OAuth and other redirect-based flows without custom per-project overrides

## Query Pattern

Auth user query is defined in `@tsu-stack/auth`:

- `getAuthUserQueryOptions()` — staleTime 5 min, gcTime 10 min, refetchOnWindowFocus "always"
- Root route `beforeLoad` prefetches auth (non-blocking `prefetchQuery`)
- Auth-guarded routes use blocking `ensureQueryData`

## Route Guards

Route groups live in the file system as pathless layouts. `__protected/` and `(guest)/` are not part of the URL — TanStack Router strips them from the matched path.

### Protected routes (`__protected/` layout group)

- `__protected/route.tsx` is the auth guard under `(root-layout)/` (NOT inside the public shell that wraps marketing/GitHub pages), so the dashboard does not inherit the public navbar/footer
- `beforeLoad` calls `ensureQueryData(getAuthUserQueryOptions())` with `revalidateIfStale: true`
- No user → redirects to `/sign-in?redirect=<current-path>`
- The `?redirect` param is validated against the route tree and any route whose id contains `__protected` is excluded (so guests never bounce back into a protected route)
- Client-side `useEffect` re-checks auth for session expiry
- Dashboard has its own sidebar layout via `__protected/dashboard/route.tsx`

### Guest-only routes (`(guest)/` pathless layout under `(root-layout)/`)

- `sign-in/` and `sign-in/create-an-account/` are wrapped by `(guest)/` to mark them as guest-only
- Authenticated users → redirected to a non-guest route (the `?redirect` param is validated against the route tree and any route whose id contains `(guest)` is excluded)
- The `?redirect` param is also sanitized to exclude `__protected/` routes (see `sign-in/index.tsx` and `create-an-account/index.tsx`)
- Registration is **invite-gated** after the first user: create-account and OAuth signup need a valid invite (see Gotchas)

## Middleware

Two auth middlewares exist for different sensitivity levels:

| Middleware            | Behavior                                 | Use case                                     |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| `authMiddleware`      | Uses cached session (5-min cookie cache) | Normal protected pages                       |
| `freshAuthMiddleware` | Hits DB, bypasses cache                  | Sensitive operations (password change, etc.) |

Both set 401 status and throw on unauthorized.

## Schema Extension

When extending the Better Auth `user` or `session` schema, update all three layers together:

- **Server auth config**: add the field under `additionalFields` in `packages/auth/src/auth.ts` (re-exported from `packages/auth/src/index.ts`)
- **Drizzle schema**: add the matching column in `packages/db/src/schema/auth.schema.ts`
- **Client inference**: keep `packages/auth/src/react/auth-client.ts` using `inferAdditionalFields<typeof auth>()` so custom fields stay typed on the client

For DB-backed auth fields, also generate and apply a Drizzle migration after the schema change. Multi-user fields already on `user`: `profileName` (public URL slug), `onboardingCompletedAt` (soft onboarding). Invite codes are **not** user columns — they are validated at `user.create` from body/cookie/OAuth state.

### `auth.schema.ts` is auto-generated

`packages/db/src/schema/auth.schema.ts` is produced by the Better Auth CLI via `vp run --filter @tsu-stack/db auth:generate` (see `packages/db/package.json`). Do not hand-edit it: any custom column you add will be wiped on the next regeneration. To extend the auth tables, change the auth config in `packages/auth/src/auth.ts` and re-run the generator. The same file also exports the `relations` for the auth tables (user/session/account/verification/passkey) using the full `defineRelations(...)` API.

### Composing auth relations with app relations

The auto-generated auth relations and the hand-written app relations in `packages/db/src/schema/relations.ts` (which uses `defineRelationsPart(...)` over the full schema) are merged in `packages/db/src/index.ts` by spreading both into a single `relations` config and passing that to `drizzle()`. This is the canonical Drizzle v2 pattern for composing relations across files when one of the relation sources is auto-generated: keep the auto-generated relations in the generated file, keep hand-written app relations in `relations.ts`, and compose the two in the db entrypoint. Do not try to rewrite the auto-generated file or hand-port its relations into `relations.ts` — the next CLI run will desync them.

## Gotchas

- **Cross-subdomain cookies are required in production.** Web (`https://salahmohsen.com`) and API (`https://api.salahmohsen.com`) are different hosts. OAuth sets the session cookie on the API host; the web SSR `$getUser` guard only sees it when Better Auth `advanced.crossSubDomainCookies` is enabled with the shared parent domain (`.salahmohsen.com`). `getSharedCookieDomain()` in `@tsu-stack/env/utils/url` derives this from `VITE_WEB_URL` + `VITE_SERVER_URL`. Localhost leaves host-only cookies (ports share the `localhost` host, so local works without the flag).
- **Invite-gated multi-user:** empty DB bootstraps the first user without an invite; further `user.create` requires a valid invite code (body, cookie, or OAuth state). Each user is a tenant (`userId` on domain rows) with a public `profileName`. GitHub account linking still uses matching email (`account.accountLinking.trustedProviders: ["github"]`) when linking to an existing user.
- Cross-domain auth setups still require deliberate cookie/domain/CORS configuration even with Better Auth defaults
- `SameSite=Strict` is usually too brittle for OAuth, email links, and other redirect-based auth flows
- The auth query uses `refetchOnWindowFocus: "always"` for cross-tab session sync
- Better Auth custom fields are not complete if you only add the DB column; the auth config and client inference must be updated too
