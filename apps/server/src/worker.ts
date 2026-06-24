import { RequestContext } from "@mastra/core/request-context";

import { orpcContextStorage } from "@tsu-stack/ai/lib/orpc-context-storage";
import { getMastra } from "@tsu-stack/ai/mastra";
import { type OrpcContext, type OrpcContextLogger } from "@tsu-stack/api/lib/context/types";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createGitHubOctokit, resolvePublicGitHubSource } from "@tsu-stack/github";
import { createRequestLogger, type RequestLogger } from "@tsu-stack/logger/server";

import { GitHubSignalRelay } from "#@/github-signal-relay";
import { app } from "#@/mastra";

export default {
  fetch(request: Request, env: Cloudflare.Env, executionContext: ExecutionContext) {
    const url = new URL(request.url);
    const websocketPath = `${new URL(ENV_SERVER.VITE_SERVER_URL).pathname}/api/ws/github-signals`;

    if (url.pathname === websocketPath) {
      const id = env.GITHUB_SIGNAL_RELAY.idFromName("global");
      const stub = env.GITHUB_SIGNAL_RELAY.get(id);
      return stub.fetch("https://internal/connect", request);
    }

    return app.fetch(request, env, executionContext);
  },
  async scheduled(event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    const mastra = await getMastra(env);
    const run = await mastra.getWorkflow("refresh-identity").createRun();
    // The cron path has no Hono request, so the Hono `c.get("log")` is
    // unavailable. Build an evlog `RequestLogger` via `createRequestLogger`
    // — the same factory the Hono middleware uses internally. This routes
    // the cron's wide events through the same evlog drain as the Hono
    // request path (Axiom / local stdout / etc., per `initLogger` config),
    // so the cron shows up in the same observability surface with the
    // same shape (`requestId`, `method: "system"`, `path: "cron: <expr>"`,
    // `event`, etc.). The `waitUntil` option keeps the drain alive past
    // the scheduled handler's return — Cloudflare's Workers `scheduled`
    // does not pass an explicit `waitUntil`, so we use `ctx.waitUntil` to
    // extend the isolate lifetime.
    const requestId = crypto.randomUUID();
    const evlogLogger: RequestLogger = createRequestLogger({
      method: "system",
      path: `cron: ${event.cron}`,
      requestId,
      waitUntil: ctx.waitUntil.bind(ctx)
    });
    // `OrpcContextLogger` requires `.set()` (used by `setRepoLoggerContext`
    // and `setRepoLoggerOutcome` to attach structured event details). The
    // evlog `RequestLogger.set` already accepts a record, so the only
    // type-shape mismatch is the optional `debug`/`info`/`warn` taking
    // arbitrary details vs. an evlog string message — we stringify so the
    // shape stays consistent with the Hono path. `debug` is a no-op
    // because evlog's logger has no debug method (the project runs at
    // `info` by default — see `packages/logger/src/server/index.ts`).
    const cronLogger: OrpcContextLogger = {
      debug: () => {},
      error: (error) => {
        if (error instanceof Error) evlogLogger.error(error);
        else evlogLogger.error(String(error));
      },
      info: (details) => evlogLogger.info(JSON.stringify(details)),
      set: (details) => evlogLogger.set(details as Parameters<typeof evlogLogger.set>[0]),
      warn: (details) => evlogLogger.warn(JSON.stringify(details))
    };
    // Build a system OrpcContext so the workflow can fetch the user's
    // public repos. The cron path has no Hono request, so we have to
    // resolve the GitHub source explicitly (the Hono `/*` middleware
    // normally does this via `createContext`). We also set
    // `requestContext.orpcContext` and wrap in `orpcContextStorage.run`
    // so the workflow's steps see the same value via either the
    // `RequestContext` (read by `gatherSourcesStep` and the GitHub
    // tools) or the AsyncLocalStorage fallback. See plan #28.
    const githubSource = await resolvePublicGitHubSource();
    const orpcContext: OrpcContext = {
      github: {
        binding: {
          executionContext: ctx,
          kv: env.GITHUB_CACHE_KV,
          signalRelay: env.GITHUB_SIGNAL_RELAY
        },
        privateOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
        publicOctokit: createGitHubOctokit(),
        source: githubSource
      },
      logger: cronLogger,
      session: null
    };
    const requestContext = new RequestContext();
    requestContext.set("orpcContext", orpcContext);
    requestContext.set("resourceId", "system");
    requestContext.set("requestId", requestId);
    requestContext.set("logger", console);
    // Open a per-run runWithDb scope so the workflow's steps see a
    // transaction-capable pool. runWithDb no longer closes the pool in
    // finally, so this scope's pool survives the workflow. See
    // docs/adr/0009. Emit the wide event when the workflow resolves so
    // the structured event lands in the same drain as the Hono path.
    // `ctx.waitUntil` keeps the isolate alive until both the workflow
    // and the drain finish.
    ctx.waitUntil(
      runWithDb(createDb(), () =>
        orpcContextStorage.run(orpcContext, async () => {
          try {
            await run.start({
              inputData: { reason: `cron: ${event.cron}` },
              requestContext
            });
            evlogLogger.emit({ cron: event.cron, outcome: "ok" });
          } catch (error) {
            evlogLogger.error(error instanceof Error ? error : new Error(String(error)), {
              cron: event.cron,
              outcome: "error"
            });
            evlogLogger.emit({ cron: event.cron, outcome: "error" });
            throw error;
          }
        })
      )
    );
  }
};

export { GitHubSignalRelay };
