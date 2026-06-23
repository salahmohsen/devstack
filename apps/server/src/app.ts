import { join } from "node:path/posix";

import { RequestContext } from "@mastra/core/request-context";
import { type RequestContext as MastraRequestContext } from "@mastra/core/request-context";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { experimental_RethrowHandlerPlugin as RethrowHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type ContentfulStatusCode } from "hono/utils/http-status";

import { getMastra } from "@tsu-stack/ai/mastra";
import {
  createContext,
  type OrpcContextBindings
} from "@tsu-stack/api/lib/context/hono/create-context";
import { type OrpcContext } from "@tsu-stack/api/lib/context/types";
import { appRouter } from "@tsu-stack/api/routers/index";
import { auth } from "@tsu-stack/auth/index";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createGitHubOctokit, handleGitHubWebhook } from "@tsu-stack/github";
import { log, parseError } from "@tsu-stack/logger/server";
import {
  honoLogIngestionMiddleware,
  honoLoggerMiddleware,
  type HonoLogVariables
} from "@tsu-stack/logger/server/hono/middleware";

import { isAlreadyProcessed } from "#@/identity-refresh-dedup";
import "#@/shared/lib/logger";

const serverBaseUrl = new URL(ENV_SERVER.VITE_SERVER_URL);
const allowedWebOrigin = new URL(ENV_SERVER.VITE_WEB_URL).origin;

const corsOptions: NonNullable<Parameters<typeof cors>[0]> = {
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-evlog-source"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  origin: (origin: string) => (origin === allowedWebOrigin ? origin : null)
};

type AppEnv = HonoLogVariables & {
  Bindings: OrpcContextBindings & {
    MASTRA_DB: D1Database;
  };
  Variables: {
    requestContext: MastraRequestContext;
  };
};

export const app = new Hono<AppEnv>().basePath(serverBaseUrl.pathname);

app.use("*", async (c, next) => cors(corsOptions)(c, next));
app.options("*", async (c, next) => cors(corsOptions)(c, next));

app.use(
  "/*",
  honoLoggerMiddleware({
    exclude: ["**/health/**", "**/_logs/ingest"],
    enrich: (ctx) => {
      ctx.event.hostname = serverBaseUrl.hostname;
    }
  })
);

app.post("/_logs/ingest", honoLogIngestionMiddleware());

app.get("/api/ws/github-signals", (c) => {
  const relay = c.env.GITHUB_SIGNAL_RELAY;
  if (!relay) {
    return c.json({ message: "GitHub signal relay is not configured." }, 503);
  }

  const id = relay.idFromName("global");
  const stub = relay.get(id);
  return stub.fetch("https://internal/connect", c.req.raw);
});

app.onError((error, c) => {
  const requestLog = c.get("log");
  if (requestLog) {
    requestLog.error(error);
  } else {
    log.error({ event: "hono_global_error", error });
  }

  const parsed = parseError(error);

  return c.json(
    {
      message: parsed.message,
      ...(parsed.code ? { code: parsed.code } : {}),
      ...(parsed.why ? { why: parsed.why } : {}),
      ...(parsed.fix ? { fix: parsed.fix } : {}),
      ...(parsed.link ? { link: parsed.link } : {})
    },
    parsed.status as ContentfulStatusCode
  );
});

app.on(["POST", "GET"], "/auth/reference", (c) =>
  c.redirect(`${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference`, 301)
);

app.get("/auth/open-api/generate-schema", async (c) => {
  const schema = await auth.api.generateOpenAPISchema();
  return c.json(schema);
});

// Better Auth uses the HTTP Drizzle singleton (`db` from `@tsu-stack/db`), not
// `getDb()`. The HTTP transport is stateless, so this route does not need
// `runWithDb` and intentionally bypasses the `/*` middleware below.
app.on(["POST", "GET"], "/auth/*", async (c) => auth.handler(c.req.raw));

// GitHub webhooks are registered before the `/*` `runWithDb` middleware (Hono
// processes handlers in registration order, so the first match wins). Without
// an explicit `runWithDb` scope here, `getDb()` throws inside the repository
// and the webhook returns 500 — causing the four github_cache_* tables to
// stay empty.
app.post("/webhooks/github", async (c) => {
  if (!ENV_SERVER.GITHUB_WEBHOOK_SECRET) {
    return c.json({ message: "GitHub webhook secret is not configured." }, 503);
  }

  const deliveryId = c.req.header("x-github-delivery");
  const event = c.req.header("x-github-event");
  const signature256 = c.req.header("x-hub-signature-256");

  if (!deliveryId || !event) {
    return c.json({ message: "Missing GitHub webhook headers." }, 400);
  }

  const rawBody = await c.req.text();
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ message: "GitHub webhook body must be valid JSON." }, 400);
  }

  // Narrow the webhook secret to `string` here so it stays narrowed inside the
  // `runWithDb` callback (TypeScript does not propagate control-flow narrowing
  // across function boundaries).
  const webhookSecret = ENV_SERVER.GITHUB_WEBHOOK_SECRET;

  return runWithDb(createDb(), async () => {
    const result = await handleGitHubWebhook({
      deliveryId,
      event,
      payload,
      rawBody,
      runtime: {
        executionContext: c.executionCtx,
        kv: c.env.GITHUB_CACHE_KV,
        signalRelay: c.env.GITHUB_SIGNAL_RELAY
      },
      signature256: signature256 ?? null,
      webhookSecret
    });

    if (result.status === 200 && result.shouldRefreshIdentity) {
      const dedupContext: OrpcContext = {
        github: {
          binding: {
            executionContext: c.executionCtx,
            kv: c.env.GITHUB_CACHE_KV
          },
          octokit: createGitHubOctokit(),
          source: { isConfigured: false, reason: "missing_github_settings" }
        },
        logger: c.get("log"),
        session: null
      };
      const already = await isAlreadyProcessed(dedupContext, deliveryId);
      if (!already) {
        const mastra = getMastra({ MASTRA_DB: c.env.MASTRA_DB });
        const run = await mastra.getWorkflow("refresh-identity").createRun();
        c.executionCtx.waitUntil(
          run.start({
            inputData: {
              commitSha: result.headSha ?? undefined,
              reason: `webhook: ${event}`
            }
          })
        );
      }
    }

    return c.json({ ok: true }, result.status);
  });
});

export const openApiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "openapi" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()]
    }),
    new OpenAPIReferencePlugin({
      docsConfig: () => {
        const apiBasePath = new URL(ENV_SERVER.VITE_SERVER_URL).pathname;
        return {
          content: undefined,
          metaData: {
            description: "Documentation for the @tsu-stack/server API.",
            title: "@tsu-stack/server API Documentation"
          },
          sources: [
            {
              title: "API Reference",
              url: join(apiBasePath, "docs", "spec.json")
            },
            {
              title: "Auth API Reference",
              url: join(apiBasePath, "auth", "open-api", "generate-schema")
            }
          ],
          theme: "deepSpace"
        };
      },
      docsPath: "/docs",
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        components: {
          securitySchemes: {
            authCookie: {
              description: `**(optional)** Session cookie from signing-in, required for protected endpoints [View Auth Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference)`,
              in: "cookie",
              name: "better_auth.session_token",
              type: "apiKey"
            }
          }
        },
        info: {
          description: `This is the API for @tsu-stack/server.\n## Usage\nFor authentication, you can sign in via the \`/sign-in\` endpoint in [the Auth Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference). Include the session cookie in subsequent requests to access protected endpoints.\n## Resources\n - [Official Website](${ENV_SERVER.VITE_WEB_URL})\n - [Auth API Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference)`,
          title: "@tsu-stack/server API",
          version: ENV_SERVER.WORKERS_CI_COMMIT_SHA
        },
        servers: [
          {
            description: "Primary API Server",
            url: ENV_SERVER.VITE_SERVER_URL
          }
        ]
      },
      specPath: "/docs/spec.json"
    }),
    new RethrowHandlerPlugin({
      filter: (error) => !(error instanceof ORPCError)
    })
  ]
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "rpc" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: []
});

app.use("/*", async (c, next) => {
  // Per-request Neon WebSocket Pool. Required by Cloudflare Workers: the
  // serverless driver's WebSocket connection cannot outlive a single request,
  // and a module-level Pool gets reused across requests → "Connection terminated"
  // (see Neon's "Pool and Client" docs).
  const db = createDb();

  return runWithDb(db, async () => {
    const context = await createContext({ context: c, logger: c.get("log") });

    // Wire the per-request Mastra RequestContext. The Mastra Hono adapter
    // (registered by mountMastra) reads `c.get("requestContext")` and reuses
    // it as the tool-execution requestContext. Tools then access the
    // orpcContext via `context.requestContext.get("orpcContext")`.
    const requestContext = new RequestContext();
    requestContext.set("orpcContext", context);
    requestContext.set("resourceId", context.session?.user?.id ?? "anonymous");
    requestContext.set("requestId", crypto.randomUUID());
    requestContext.set("logger", c.get("log"));
    c.set("requestContext", requestContext);

    const rpcResult = await rpcHandler.handle(c.req.raw, {
      context,
      prefix: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "rpc") as `/${string}`
    });

    if (rpcResult.matched) {
      return c.newResponse(rpcResult.response.body, rpcResult.response);
    }

    if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
      const docsResult = await openApiHandler.handle(c.req.raw, {
        context,
        prefix: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "docs") as `/${string}`
      });

      if (docsResult.matched) {
        return c.newResponse(docsResult.response.body, docsResult.response);
      }
    }

    const openApiResult = await openApiHandler.handle(c.req.raw, {
      context,
      prefix: new URL(ENV_SERVER.VITE_SERVER_URL).pathname as `/${string}`
    });

    if (openApiResult.matched) {
      return c.newResponse(openApiResult.response.body, openApiResult.response);
    }

    await next();
  });
});
