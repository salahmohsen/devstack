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

import {
  createContext,
  type OrpcContextBindings
} from "@tsu-stack/api/lib/context/hono/create-context";
import { handleGmailPushNotification } from "@tsu-stack/api/lib/gmail/handle-gmail-push";
import { handleResendInboundWebhook } from "@tsu-stack/api/lib/mail/handle-resend-inbound";
import { appRouter } from "@tsu-stack/api/routers/index";
import { auth } from "@tsu-stack/auth/index";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { getApiBasePath, joinApiPath } from "@tsu-stack/env/utils/url";
import { handleGitHubWebhook } from "@tsu-stack/github";
import { createRedisCacheAdapter } from "@tsu-stack/github/infrastructure/cache/redis-cache-adapter";
import { createLogger, log, parseError } from "@tsu-stack/logger/server";
import {
  honoLogIngestionMiddleware,
  honoLoggerMiddleware,
  type HonoLogVariables
} from "@tsu-stack/logger/server/hono/middleware";

import { enqueueMailClassify } from "#@/queues/mail-classify-queue";
import { getRuntime } from "#@/runtime-context";
import "#@/shared/lib/logger";

const serverBaseUrl = new URL(ENV_SERVER.VITE_SERVER_URL);
/** Empty when `VITE_SERVER_URL` has no path (e.g. `https://api.example.com`). */
const apiBasePath = getApiBasePath(ENV_SERVER.VITE_SERVER_URL);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  try {
    const web = new URL(ENV_SERVER.VITE_WEB_URL);
    origins.add(web.origin);
    // Local dev: allow localhost ↔ 127.0.0.1 so credentials work either way.
    if (LOOPBACK_HOSTS.has(web.hostname)) {
      for (const host of LOOPBACK_HOSTS) {
        if (host.startsWith("[")) continue;
        origins.add(`${web.protocol}//${host}${web.port ? `:${web.port}` : ""}`);
      }
    }
  } catch {
    // ignore invalid VITE_WEB_URL at boot; CORS will deny everything
  }
  return origins;
}

const allowedOrigins = buildAllowedOrigins();

const corsOptions: NonNullable<Parameters<typeof cors>[0]> = {
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-evlog-source"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  origin: (origin: string) => (allowedOrigins.has(origin) ? origin : null)
};

type AppEnv = HonoLogVariables & {
  Bindings: OrpcContextBindings;
};

export const app = apiBasePath ? new Hono<AppEnv>().basePath(apiBasePath) : new Hono<AppEnv>();

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

app.get("/health/live", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

app.get("/health/ready", async (c) => {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  const dbStart = performance.now();
  try {
    const { checkIsDbReady } = await import("@tsu-stack/db");
    const isReady = await checkIsDbReady();
    checks.database = {
      status: isReady ? "healthy" : "unhealthy",
      latencyMs: Math.round(performance.now() - dbStart)
    };
  } catch {
    checks.database = {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - dbStart)
    };
  }

  const redisStart = performance.now();
  try {
    const redis = getRuntime().redis;
    const pong = await redis.ping();
    checks.redis = {
      status: pong === "PONG" ? "healthy" : "unhealthy",
      latencyMs: Math.round(performance.now() - redisStart)
    };
  } catch {
    checks.redis = {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - redisStart)
    };
  }

  const allHealthy = Object.values(checks).every((v) => v.status === "healthy");
  if (!allHealthy) {
    // Health routes are excluded from honoLoggerMiddleware — emit a durable event only when degraded.
    const readyLog = createLogger({ operation: "server__health_ready" });
    readyLog.set({
      event: "health_ready_unhealthy",
      checks
    });
    readyLog.emit({ _forceKeep: true });
  }

  return c.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks
    },
    allHealthy ? 200 : 503
  );
});

app.get("/", (c) =>
  c.json({
    name: "tsu-stack-server",
    status: "ok",
    timestamp: new Date().toISOString()
  })
);

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

app.on(["POST", "GET"], "/auth/*", async (c) => auth.handler(c.req.raw));

app.post("/webhooks/github", async (c) => {
  const requestLog = c.get("log");

  if (!ENV_SERVER.GITHUB_WEBHOOK_SECRET) {
    requestLog?.set({
      event: "github_webhook_not_configured",
      status: 503
    });
    return c.json({ message: "GitHub webhook secret is not configured." }, 503);
  }

  const deliveryId = c.req.header("x-github-delivery");
  const event = c.req.header("x-github-event");
  const signature256 = c.req.header("x-hub-signature-256");

  requestLog?.set({
    event: "github_webhook_received",
    github: {
      deliveryId: deliveryId ?? null,
      event: event ?? null
    }
  });

  if (!deliveryId || !event) {
    requestLog?.set({ event: "github_webhook_missing_headers", status: 400 });
    return c.json({ message: "Missing GitHub webhook headers." }, 400);
  }

  const rawBody = await c.req.text();
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    requestLog?.set({ event: "github_webhook_invalid_json", status: 400 });
    return c.json({ message: "GitHub webhook body must be valid JSON." }, 400);
  }

  const webhookSecret = ENV_SERVER.GITHUB_WEBHOOK_SECRET;

  const db = createDb();
  return runWithDb(db, async () => {
    const runtime = getRuntime();
    const result = await handleGitHubWebhook({
      deliveryId,
      event,
      payload,
      rawBody,
      runtime: {
        broadcast: runtime.broadcastSignals,
        kv: createRedisCacheAdapter(runtime.redis)
      },
      signature256: signature256 ?? null,
      webhookSecret
    });

    requestLog?.set({
      event: "github_webhook_handled",
      status: result.status
    });

    return c.json({ ok: true }, result.status);
  });
});

/**
 * Gmail Pub/Sub push (users.watch). Body is Google Cloud Pub/Sub push envelope.
 * Configure subscription → {VITE_SERVER_URL}/webhooks/gmail-push
 * Optional: GMAIL_PUSH_SHARED_SECRET as Authorization: Bearer <secret>
 */
app.post("/webhooks/gmail-push", async (c) => {
  const requestLog = c.get("log");
  const expected = process.env.GMAIL_PUSH_SHARED_SECRET?.trim();
  if (expected) {
    const auth = c.req.header("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
    if (token !== expected) {
      requestLog?.set({ event: "gmail_push_unauthorized", status: 401 });
      return c.json({ ok: false }, 401);
    }
  }

  const rawBody = await c.req.text();
  requestLog?.set({ event: "gmail_push_received" });

  const db = createDb();
  return runWithDb(db, async () => {
    const result = await handleGmailPushNotification(rawBody);
    requestLog?.set({
      event: "gmail_push_handled",
      handled: result.handled,
      skipped: result.skipped
    });
    // Opaque 200 — never leak mailbox/user ids to the push client.
    return c.json({ ok: true });
  });
});

/**
 * BYO Resend inbound — each tenant pastes a unique URL from Settings → Mail.
 * Secrets and API keys live on user_mail_settings (not platform env).
 */
app.post("/webhooks/resend/:webhookToken", async (c) => {
  const requestLog = c.get("log");
  const webhookToken = c.req.param("webhookToken")?.trim() ?? "";

  requestLog?.set({
    event: "resend_webhook_received",
    resend: { tokenPrefix: webhookToken.slice(0, 6) || null }
  });

  if (!webhookToken || webhookToken.length < 16) {
    requestLog?.set({ event: "resend_webhook_bad_token", status: 404 });
    return c.json({ message: "Unknown webhook." }, 404);
  }

  const rawBody = await c.req.text();
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  const db = createDb();
  return runWithDb(db, async () => {
    const result = await handleResendInboundWebhook({
      webhookToken,
      rawBody,
      svixId: svixId ?? null,
      svixTimestamp: svixTimestamp ?? null,
      svixSignature: svixSignature ?? null
    });

    let classifyJobId: string | null = null;
    if (
      result.status === 200 &&
      result.reason === "persisted" &&
      result.messageId &&
      result.userId &&
      !result.duplicate
    ) {
      try {
        const enqueued = await enqueueMailClassify({
          messageId: result.messageId,
          userId: result.userId
        });
        classifyJobId = enqueued.jobId ?? null;
      } catch (error) {
        requestLog?.error(error instanceof Error ? error : String(error), {
          event: "resend_classify_enqueue_failed",
          messageId: result.messageId
        });
      }
    }

    requestLog?.set({
      event: "resend_webhook_handled",
      status: result.status,
      resend: {
        reason: result.reason,
        messageId: result.messageId ?? null,
        duplicate: result.duplicate ?? false,
        classifyJobId
      }
    });

    if (result.status === 401) {
      return c.json({ message: "Invalid webhook signature." }, 401);
    }
    if (result.status === 404) {
      return c.json({ message: "Unknown webhook." }, 404);
    }
    if (result.status === 503) {
      return c.json({ message: "Inbound mail is not enabled for this endpoint." }, 503);
    }
    if (result.status === 400) {
      return c.json({ message: "Invalid webhook payload." }, 400);
    }

    return c.json(
      {
        ok: true,
        reason: result.reason,
        messageId: result.messageId ?? null,
        duplicate: result.duplicate ?? false,
        classifyJobId
      },
      result.status
    );
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
        return {
          content: undefined,
          metaData: {
            description: "Documentation for the @tsu-stack/server API.",
            title: "@tsu-stack/server API Documentation"
          },
          sources: [
            {
              title: "API Reference",
              url: joinApiPath(apiBasePath, "docs", "spec.json")
            },
            {
              title: "Auth API Reference",
              url: joinApiPath(apiBasePath, "auth", "open-api", "generate-schema")
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
          version: ENV_SERVER.SOURCE_COMMIT
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
  // Shared process pool via createDb() — do not call pool.end() per request.
  const db = createDb();

  return runWithDb(db, async () => {
    const runtime = getRuntime();
    const context = await createContext({
      context: c,
      logger: c.get("log"),
      runtime
    });

    const rpcResult = await rpcHandler.handle(c.req.raw, {
      context,
      prefix: joinApiPath(apiBasePath, "rpc")
    });

    if (rpcResult.matched) {
      return c.newResponse(rpcResult.response.body, rpcResult.response);
    }

    if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
      const docsResult = await openApiHandler.handle(c.req.raw, {
        context,
        prefix: joinApiPath(apiBasePath, "docs")
      });

      if (docsResult.matched) {
        return c.newResponse(docsResult.response.body, docsResult.response);
      }
    }

    const openApiResult = await openApiHandler.handle(c.req.raw, {
      context,
      // Root mount: OpenAPI handler prefix is `/` (not empty string).
      prefix: (apiBasePath || "/") as `/${string}`
    });

    if (openApiResult.matched) {
      return c.newResponse(openApiResult.response.body, openApiResult.response);
    }

    await next();
  });
});
