# TanStack Patterns

Use this when working with TanStack Start routes, route structure, `beforeLoad`, and route-level React Query preloading.

This guide is intentionally focused on TanStack Router and TanStack Start. For other concerns, use the more specific docs:

- [API fetching patterns](./api-fetching-patterns.md)
- [oRPC patterns](./orpc.md)

## Routing

The web app uses TanStack Start file-based routing. In this codebase, `routes/` acts as the FSD app layer.

### FSD Layers

| Layer    | Dir         | Purpose                                              |
| -------- | ----------- | ---------------------------------------------------- |
| app      | `routes/`   | Thin wrappers: loaders, guards, component references |
| pages    | `pages/`    | Full page UI                                         |
| widgets  | `widgets/`  | Composite UI (layouts)                               |
| features | `features/` | User-facing capabilities (forms, navbar)             |
| entities | `entities/` | Domain objects                                       |
| shared   | `shared/`   | Utilities, providers, hooks — no business logic      |

Imports only go downward.

### Segment Structure

```
segment-name/
  index.ts       → Barrel (public API, only re-exports)
  ui/            → React components
  lib/           → Business logic, integrations
  utils/         → Pure helpers
  types/         → Zod schemas + inferred types
  hooks/         → Custom React hooks
  stores/        → Zustand stores
  api/           → Slice-local TanStack Query wrappers
    get-thing.query.ts
    create-thing.mutation.ts
```

### Route Hierarchy

Under `apps/web/src/routes/(root-layout)/`:

| Segment            | Role                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `(guest)/`         | Pathless guest-only shell for `sign-in` and `sign-up` (legacy `/sign-in/create-an-account` redirects)                             |
| `__protected/`     | Auth guard + Suspense; dashboard sidebar via `__protected/dashboard/route.tsx` (no public navbar/footer)                          |
| `$username/`       | Public path portfolio for a tenant (`/{username}/…`)                                                                              |
| `$username/repos/` | Public GitHub repos for that profile                                                                                              |
| `repos/`           | Custom-domain-only public GitHub hub (`/repos` on verified Host); on primary app host this redirects away from a global owner hub |
| Marketing / legal  | e.g. privacy, terms — public layout                                                                                               |

There is **no** `{-$locale}` route segment in this app today. Prefer profile-aware helpers (e.g. `useRepoRouteLinks`) when the same UI must work under `/{username}/repos` and Host-scoped `/repos`.

### Adding a Route

1. Create page component in `pages/<name>/ui/<name>-page.tsx`, export via `pages/<name>/index.ts`
2. Create route under `routes/(root-layout)/…` (or the appropriate layout group)
3. Route file imports the page component and wires `beforeLoad` with React Query preloading
4. Keep route files thin: route metadata, guards, preloading, and component wiring only
5. Public portfolio/GitHub routes: resolve tenant via `username` and/or Host — never a global site owner

## Route Files Stay Thin

- Put page UI in `pages/`
- Put business logic in slice modules
- Put query and mutation wiring in slice-local `api/` files
- When route params or search state depend on shared enums or defaults, import the schema and defaults from `packages/core` instead of recreating `z.enum([...])` arrays in the route file
- Avoid business logic directly in route files

Typical route responsibilities:

- auth or guest redirects
- `ensureQueryData(...)`
- not-found handling
- passing preloaded data into route context

## React Query Preloading

All caching is via React Query, not the router loader cache. `defaultPreloadStaleTime: 0` is intentional in this repo.

Use `ensureQueryData(...)` in `beforeLoad`:

```ts
await context.queryClient.ensureQueryData(getThingQueryOptions(id));
```

Use exported query option factories from slice modules. Do not inline query wiring in routes.

## Gotchas

- `defaultPreloadStaleTime: 0` is deliberate
- Caching lives in React Query, not the router cache
- Route files should stay thin
- Barrel files (`index.ts`) are the public API
- Pathless layout routes (parenthesized dirs) group routes without changing URLs
