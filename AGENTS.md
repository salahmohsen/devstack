# tsu-stack

Opinionated full-stack TypeScript monorepo: TanStack Start + Hono + oRPC + Drizzle + Better Auth, powered by Vite Plus.

## Start Here

- Start with the most specific `.agents/*.md` file for the task.
- Follow links from that file for adjacent context instead of reading several docs up front.
- Keep guidance in its owning file. Link instead of repeating rules across docs.

## Cross-Cutting Docs

- [Vite+ toolchain](.agents/vite-plus.md) for package management, workspace scripts, and CLI syntax.
- [Workflow](.agents/workflow.md) for validation timing, build checks, and migration safety.
- [Logging](.agents/logging.md) only when adding, changing, or keeping durable logs.
- [Testing](.agents/testing.md) only when tests are explicitly requested or the task is test-specific.

## Topic Index

Pick the most specific file for the task. Use links within that file instead of reading the whole docs tree linearly.

### Delivery Flows

- [End-to-end feature workflow](.agents/end-to-end-features.md) for full-stack feature work spanning `packages/db`, `packages/core`, `packages/api`, and `apps/web`.

### App And Frameworks

- [TanStack patterns](.agents/tanstack-patterns.md) for route structure, `beforeLoad`, layouts, and route-level preloading.
- [API fetching patterns](.agents/api-fetching-patterns.md) for slice-local TanStack Query and oRPC client wrappers in `apps/web`.
- [oRPC patterns](.agents/orpc.md) for server procedures, router shape, typed errors, and request-scoped handler logging.
- [Auth patterns](.agents/auth.md) for Better Auth architecture, invite-gated signup, auth query behavior, and protected/guest route rules.
- [SEO patterns](.agents/seo.md) for route `head()` usage and `@tsu-stack/seo` integration.
- [Product glossary](./CONTEXT.md) for multi-user terms (`username`, invite, custom domain, tenant `userId`, public GitHub surface).

### Shared Packages And Platform

- [Core package patterns](.agents/core.md) for shared domain contracts in `packages/core`, file roles, and propagation into API and web code.
- [Media storage and uploads](.agents/media-storage.md) for preemptive S3 object conventions, first-implementation workflow, delete policy, and storage env configuration.
- [UI guidelines](.agents/ui.md) for app UI composition, extraction decisions, and `packages/ui` boundaries.
- [TypeScript conventions](.agents/typescript.md) for schema placement, import boundaries, and `lib/` vs `utils/`.
- [Environment variables](.agents/environment-variables.md) for env scoping, validation, and Docker propagation.
- [Logging](.agents/logging.md) for `@tsu-stack/logger` / evlog wide events, levels, request-scoped emit-once rules, agent jobs, and CLI (`map` / `doctor`). Load when adding durable logs, upgrading evlog, or wiring the agent app logger.
- [Mastra agent app](apps/agent/AGENTS.md) for agents, workflows, tools, scorers, memory threads, feedback/datasets, and AI job conventions. Load the `mastra` skill first for any Mastra work.
- [assistant-ui](.agents/skills/assistant-ui/SKILL.md) for hub chat architecture. Route to [tools](.agents/skills/tools/SKILL.md) (HITL / toolkit UI), [primitives](.agents/skills/primitives/SKILL.md) (Thread / Composer / Message), [runtime](.agents/skills/runtime/SKILL.md), [markdown](.agents/skills/markdown/SKILL.md). Do **not** load [cloud](.agents/skills/cloud/SKILL.md) or [react-mcp](.agents/skills/react-mcp/SKILL.md) — this app has no Assistant Cloud and no user-managed MCP. Use [setup](.agents/skills/setup/SKILL.md) / [update](.agents/skills/update/SKILL.md) only for install or version jumps.

### Active program specs

- [Career Inbox + AI platform](docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md) — mail hub, review queue, notifications, AI autonomy, learning, logging/Mastra foundation.
- [Career Mail Assistant P0](docs/superpowers/specs/2026-07-31-career-mail-assistant-design.md) — design lock + [implementation plan](docs/superpowers/plans/2026-07-31-career-mail-assistant-p0.md).
- [Seeker applications CRM](docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md) — pipeline board/list that Career Inbox advances.
- [Job discovery adapters](docs/superpowers/specs/2026-08-14-job-discovery-adapters-design.md) — public board adapters, shared catalog, cheap rank + BYO AI; mail harvest opt-in.

## Task Entry Points

- UI work: Start with [UI guidelines](.agents/ui.md). Add [TanStack patterns](.agents/tanstack-patterns.md) when the task touches route/file placement, loaders, or page composition. Prefer coss skills for local primitives; use [shadcn registries](.agents/skills/shadcn-registries/SKILL.md) when searching community registries beyond `components.json`. Hub chat / tool UI / composer: load [assistant-ui](.agents/skills/assistant-ui/SKILL.md) plus [tools](.agents/skills/tools/SKILL.md) and [primitives](.agents/skills/primitives/SKILL.md).
- Bugfix: Start with the owning domain doc from the index above, then use [Workflow](.agents/workflow.md) for narrow validation. Add [Core package patterns](.agents/core.md) when the fix touches shared enums, schemas, formatters, defaults, or other cross-package contracts. Add [Logging](.agents/logging.md) or [Testing](.agents/testing.md) only when the task explicitly calls for them or their policies require them.
- Uploads or object storage: Start with [Media storage and uploads](.agents/media-storage.md). Use it even for the first storage feature in this repo, then update it in the same change once the real provider, env surface, and asset purposes are known. Add [Core package patterns](.agents/core.md) when changing shared upload contracts, [oRPC patterns](.agents/orpc.md) when wiring route handlers, and [Environment variables](.agents/environment-variables.md) when storage config changes.
- End-to-end feature: Start with [End-to-end feature workflow](.agents/end-to-end-features.md), then load the relevant domain docs such as [Core package patterns](.agents/core.md), [oRPC patterns](.agents/orpc.md), [API fetching patterns](.agents/api-fetching-patterns.md), [TanStack patterns](.agents/tanstack-patterns.md), [Auth patterns](.agents/auth.md), or [UI guidelines](.agents/ui.md).
- App / AI feature hardening: After implementing dashboard or AI product behavior (hub chat tools, HITL cards, detect/organize stacks, Mastra workflows, multi-entry UI flows), run [app-ai-feature-hardening](.agents/skills/app-ai-feature-hardening/SKILL.md) before claiming done. Plans and designs for those features must link this skill and require a fresh hardening report plus lessons appended to that skill's `LESSONS.md`.

<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `vpx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `vpx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## TanStack Docs

Use `pnpm tanstack` (aliased to `vpx @tanstack/cli@latest`) to look up TanStack documentation. Always pass `--json` for machine-readable output.

```bash
# List TanStack libraries (optionally filter by --group state|headlessUI|performance|tooling)
pnpm tanstack libraries --json

# Fetch a specific doc page
pnpm tanstack doc router framework/react/guide/data-loading --json
pnpm tanstack doc query framework/react/overview --docs-version v5 --json

# Search docs (optionally filter by --library, --framework, --limit)
pnpm tanstack search-docs "server functions" --library start --json
pnpm tanstack search-docs "loaders" --library router --framework react --json
```

## CRITICAL: Load `mastra` skill first whenever dealing with ai and mastra

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## Rules

- Register all agents, tools, workflows, and scorers in `apps/agent/src/mastra/index.ts`
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` / `mastra build` directly

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
