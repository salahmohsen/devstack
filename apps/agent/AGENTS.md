# AGENTS.md — `apps/agent` (Mastra)

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions. Prefer embedded docs under `node_modules/@mastra/*/dist/docs/` and Context7 (`/mastra-ai/mastra`, `/websites/mastra_ai`) for the installed version.

## Cross-links

- Program design: [Career Inbox + AI platform](../../docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md)
- Monorepo index: [Agents.md](../../Agents.md)
- Logging facade: [Logging](../../.agents/logging.md) — use `@tsu-stack/logger` only; never import `evlog` directly from this app
- Product glossary: [CONTEXT.md](../../CONTEXT.md)

## Rules

- Register all agents, tools, workflows, and scorers in `src/mastra/index.ts`
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` / `mastra build` directly
- **No weather example** — do not reintroduce weather agent, tool, scorers, or workflow
- Prefer **workflow + steps** for multi-step jobs (see `resume-import-workflow/`); call agents inside steps when open-ended tool use is needed
- Put shared Zod contracts in `@tsu-stack/core` when API/web also consume them
- Agent `id`: kebab-case; Mastra registration key: camelCase
- Attach **scorers** with explicit `sampling` rates; register scorers on the Mastra instance
- Multi-tenant: never mix `userId` data in prompts, memory threads, or few-shot corrections
- Reply-assist: **job/application context is a required first step**; fail closed without it
- Learning: user corrections → app storage + Mastra feedback/datasets; do not assume fine-tuning APIs
- Logging: `initLogger` / `createLogger` from `@tsu-stack/logger/server` for job outcomes; include `traceId` when present; one `emit()` per wide-event lifetime
- **Auth:** `MastraAuthBetterAuth` (`@mastra/auth-better-auth`) with the shared Better Auth instance. Server forwards the user's session as `Authorization: Bearer <session_token>`. Same `BETTER_AUTH_SECRET` + app `DATABASE_URL` as the API. Never expose the agent HTTP port without auth.
- **LLM keys:** BYO only via Settings → AI (workflow `input.llm` / requestContext). No `DEEPSEEK_API_KEY` or other provider env keys.

## Layout conventions

```text
src/mastra/
  agents/          # createXAgent() factories
  workflows/       # <name>-workflow/ with steps + index.ts
  tools/           # createTool definitions
  scorers/         # createScorer + prebuilt re-exports; register in index
  model-config.ts  # optional preset lists (docs/defaults); runtime model = Settings BYO
  runtime-llm.ts   # BYO model resolution for generate() / requestContext
  byo-model.ts     # thin re-exports for agents/workflows
  index.ts         # single registration surface (MastraAuthBetterAuth + agents/workflows)
```

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
- [evlog](https://www.evlog.dev/) / [CLI overview](https://www.evlog.dev/cli/overview) — via monorepo logger package + `.agents/logging.md`
