# Testing Policy

This document is the authoritative testing policy for contributors and AI agents in this repository.

## Core Policy

- Assume no tests unless explicitly requested.
- Never auto-add tests to feature work.
- Respect unit and e2e conventions enumerated below.
- Use Vite+ setup for new test environments.
- Do not generate, modify, suggest, or proactively add tests unless the developer explicitly asks.
- Implementation requests should return implementation only unless tests are explicitly requested.
- Inspect nearby tests before generating new ones.
- Use Vite+ testing conventions, not standalone Vitest defaults.

## Test Commands

Canonical commands:

- `vp run test:unit:run` — monorepo unit suite (`vp run -r --parallel test:unit`)
- `vp run test:e2e:run`

### Unit tests and the package graph

`vp run -r test:unit` (without `--parallel`) schedules packages in **dependency order** from `package.json`. If a dependency package’s suite fails, later packages may never run — useful for **build**, wrong for **independent unit tests**.

Use **`--parallel`** (already in `test:unit:run`) so every package with `test:unit` runs regardless of graph edges and one failure still surfaces the rest. See [Vite+ Run → Parallel mode](https://viteplus.dev/guide/run#parallel-mode).

CI: one `test` job calling `vp run test:unit:run` is enough; do **not** add a per-package matrix for unit tests unless suites become large or need different runners/env.

## Test Locations

Unit tests:

- `src/**/__tests__/*.test.ts`

End-to-end tests:

- `__e2e__/**/*.spec.ts`

Use `__e2e__` as the project convention for end-to-end tests.

## Vite+ / Vitest Setup Rule

When tests are explicitly requested, and the package or app does not already have Vite+ testing configured:

1. Install and configure Vite+.
2. Add a root `vite.config.ts` in the package or app being tested.
3. Do not create `vitest.config.ts`.
4. Put Vitest config inside `vite.config.ts` using Vite+ conventions.

Default config:

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"]
  }
});
```

Explicit rules:

- The Vitest config belongs in `vite.config.ts`.
- `vitest.config.ts` should not be used in this repository.
- Follow the Vite+ test docs as the source of truth: https://viteplus.dev/guide/test

## When Tests Are Explicitly Requested

Generate behavior-driven tests that prioritize:

- happy paths
- edge cases and fallback precedence
- pathological inputs
- regression-prone cases
- contract invariants

Prefer:

- table-driven tests
- testing public contracts over internals
- fixtures and builders to reduce duplication
- adding regression tests for bug fixes
- mirroring nearby test structure

## Agent and AI surfaces

Still do not add tests unless the user, a plan, or an [ai-feature-harness](./skills/ai-feature-harness/SKILL.md) loop explicitly needs a seam test. When that happens, prefer contracts from [runtime-hardening.md](./skills/ai-feature-harness/runtime-hardening.md) over UI snapshots or AgentCore evals:

- Unauthenticated agent HTTP and oRPC chat fail closed
- `memory: { thread, resource }` is required; `resource` is the session user (`mapUserToResourceId`)
- Tool Zod schemas reject empty `{}` on get-by-id
- Chat/generate payloads cap array length and string size
- No provider API keys in agent env; BYO missing is a product error
- Foreign `userId` cannot appear in Memory, prompts, or few-shot
- Tool / model / worker-down errors stay product-shaped

Prefer table-driven unit tests at `packages/core` / agent-pure / API router seams, plus one live stream smoke when the loop requires it. Register Mastra scorers with explicit `sampling` when adding a quality baseline — do not add `agentcore run eval`, CloudWatch online-eval, or `agentcore.json`.

UI / HITL / dual-entry proof stays in the hardening skill (browser + shared-state matrix), not in this policy.
