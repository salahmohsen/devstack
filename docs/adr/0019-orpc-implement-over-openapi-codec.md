# oRPC Mounted via @Implement over OpenAPIHandlerCodecCore

The NestJS server uses `@orpc/nest`'s `@Implement(appRouter.x)` to expose
every oRPC router. Each router mounted there is served via `OpenAPIHandlerCodecCore`,
the only codec `@orpc/nest` ships with — `@orpc/nest` has no `RPCHandler`-based
mode. The browser client therefore uses `OpenAPILink` instead of `RPCLink`,
backed by a generated `contract.json` (shape-minified router); TanStack Start's
SSR path continues to use `createRouterClient(appRouter, …)` in-process.

Why OpenAPI instead of oRPC's custom RPC format:

- `@orpc/nest` is hard-wired to `OpenAPIHandlerCodecCore`. There is no
  configuration switch to use oRPC's own RPC format instead.
- OpenAPI produces a documented spec at `/docs`, consumable by Postman and
  any HTTP client, useful for a public portfolio API.
- The browser can't import `appRouter` (handlers reference server-only
  modules). `minifyContractRouter` produces a JSON-safe shape that the
  client imports and casts to `typeof appRouter`.

We reuse the existing `appRouter` (handlers included) instead of
stripping implementations into separate `@orpc/contract` shapes and
re-implementing handlers in NestJS controllers. The two views of the
same router exist: `appRouter` (server-side, with handlers) and the
shape-minified JSON used as `RouterContract` for `OpenAPILink`
(client-side, schema only). No duplication of business logic.
