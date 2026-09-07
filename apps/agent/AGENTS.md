# AGENTS.md — `apps/agent` (Mastra)

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions. Prefer embedded docs under `node_modules/@mastra/*/dist/docs/` and Context7 (`/mastra-ai/mastra`, `/websites/mastra_ai`) for the installed version.

## Cross-links

- Program design: [Career Inbox + AI platform](../../docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md)
- Monorepo index: [Agents.md](../../Agents.md)
- Logging facade: [Logging](../../.agents/logging.md) — use `@tsu-stack/logger` only; never import `evlog` directly from this app
- Product glossary: [CONTEXT.md](../../CONTEXT.md)
- After shipping hub tools / workflows / HITL: [ai-feature-harness](../../.agents/skills/ai-feature-harness/SKILL.md) (required verification + living `LESSONS.md`)
- Production/runtime checks (auth, secrets, tenant, validation, traces): [runtime-hardening.md](../../.agents/skills/ai-feature-harness/runtime-hardening.md). Do not run AWS AgentCore skills (`agentcore`, `agentcore.json`).

## Rules

- Register all agents, tools, workflows, and scorers in `src/mastra/index.ts`
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` / `mastra build` directly
- **Do not add `apps/agent/package-lock.json`** — Mastra's nested `.mastra/output` install detects the nearest lockfile; a local npm lock forces `npm install` (registry ETIMEDOUT in Docker). Use the monorepo `pnpm-lock.yaml` only.
- **No weather example** — do not reintroduce weather agent, tool, scorers, or workflow
- Prefer **workflow + steps** for multi-step jobs (see `resume-import-workflow/`); call agents inside steps when open-ended tool use is needed
- Put shared Zod contracts in `@tsu-stack/core` when API/web also consume them
- Agent `id`: kebab-case; Mastra registration key: camelCase
- Attach **scorers** with explicit `sampling` rates; register scorers on the Mastra instance
- Multi-tenant: never mix `userId` data in prompts, memory threads, or few-shot corrections
- Reply-assist: **job/application context is a required first step**; fail closed without it
- Learning: user corrections → app storage + Mastra feedback/datasets; do not assume fine-tuning APIs
- Logging: `initLogger` / `createLogger` from `@tsu-stack/logger/server` for job outcomes; include `traceId` when present; one `emit()` per wide-event lifetime
- **Auth:** `MastraAuthBetterAuth` with a **session-only** Better Auth instance (`session-auth.ts`) — same `BETTER_AUTH_SECRET` + app session tables as the API (do not import full `@tsu-stack/auth`; Mastra cannot bundle it). Server forwards the user's session as `Authorization: Bearer <session_token>`. Never expose the agent HTTP port without auth.
- **LLM keys:** BYO only via Settings → AI (workflow `input.llm` / requestContext). No `DEEPSEEK_API_KEY` or other provider env keys.
- **Provider catalog:** generated from the installed `@mastra/core` registry. After bumping `@mastra/core`, run `pnpm mastra:sync-catalog` and commit `packages/core/src/ai-settings/mastra-provider-catalog.ts` (CI fails on drift via the script's `--check`; `pnpm dev` self-heals locally).
- **Core / db ESM caches:** Mastra prebundles `@tsu-stack/core` and `@tsu-stack/db` to `packages/{core,db}/node_modules/.cache/@tsu-stack__{core,db}.mjs` and does not invalidate them when source exports change. New exports then crash the agent (`does not provide an export named '…'`) and every workflow looks like “AI temporarily unavailable”. `pnpm --filter @tsu-stack/agent rebuild:core-cache` / `rebuild:db-cache` (both run from `dev`) regenerate those files.
- **Memory (hub chat):** Agents with `new Memory()` need `memory: { thread, resource }` on chat/generate bodies (see `packages/api/src/lib/agent/hub-memory.ts`). Do **not** pass only top-level `threadId`/`resourceId` — prepare-stream ignores those and throws `threadId "undefined"`. Auth middleware still sets resourceId via `mapUserToResourceId`.

## Layout conventions

```text
src/mastra/
  agents/          # createXAgent() factories
  workflows/       # <name>-workflow/ with steps + index.ts
  tools/           # createTool definitions
  scorers/         # createScorer + prebuilt re-exports; register in index
  skills-paths.ts  # absolute paths into apps/agent/skills/
  model-config.ts  # optional preset lists (docs/defaults); runtime model = Settings BYO
  runtime-llm.ts   # BYO model resolution for generate() / requestContext
  byo-model.ts     # thin re-exports for agents/workflows
  index.ts         # single registration surface (MastraAuthBetterAuth + agents/workflows)
skills/            # Mastra Agent Skills (SKILL.md) — progressive disclosure
  write-skills/           # meta: how to author skills
  mail-classification/    # Career Inbox system labels (AI-only)
  job-notifier-harvest/   # extract jobs from digests (AI-only)
  job-preference-match/   # score harvested jobs vs prefs
```

## Career mail: AI + skills only

- **Classify** and **job harvest** must not depend on regex/keyword prefilters or deterministic extractors.
- Agents load skills from `skills/` via `skills: [path]` — see [Agent skills](https://mastra.ai/docs/agents/skills) and [Workspace skills](https://mastra.ai/docs/workspace/skills).
- **User smart filters** are injected each classify run as a dynamic `createSkill({ name: "user-smart-filters", ... })` (title/description/hints → AI assigns `rule:{slug}`). No keyword matching.
- To add a new classification skill: follow **write-skills**, add `skills/<slug>/SKILL.md`, attach path on the agent.
- Server path: `run-mail-classify` → Mastra `mail-classify-workflow` → on `job_notifier` enqueue harvest → `mail-job-harvest-workflow`.

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
- [evlog](https://www.evlog.dev/) / [CLI overview](https://www.evlog.dev/cli/overview) — via monorepo logger package + `.agents/logging.md`
