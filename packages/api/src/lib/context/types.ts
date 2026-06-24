/**
 * The full per-request context for oRPC procedures. Constructed in
 * `packages/api/src/lib/context/hono/create-context.ts` and threaded through
 * `packages/github` functions and AI tools in `packages/ai`.
 *
 * The types are defined structurally in `packages/core/src/ai/orpc-context.ts`
 * so `packages/ai` can import them without depending on `packages/api`. This
 * file re-exports the same names for backwards compatibility with the existing
 * `import { type OrpcContext } from "@tsu-stack/api/lib/context/types"` sites
 * in `packages/api`, `packages/github`, and `apps/server` (which does not depend
 * on `@tsu-stack/core` directly).
 */
export type { OrpcContext, OrpcContextLogger } from "@tsu-stack/core/ai/orpc-context";
