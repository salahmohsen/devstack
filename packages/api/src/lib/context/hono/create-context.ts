import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { createRedisCacheAdapter } from "@tsu-stack/github/infrastructure/cache/redis-cache-adapter";
import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import {
  resolvePublicGitHubSourceForUser,
  validateGitHubAccessToken
} from "@tsu-stack/github/shared/public-github-source";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { resolveAgentSessionToken } from "#@/lib/agent/resolve-session-token";
import { createAgentWorker } from "#@/lib/agent/worker";
import { type OrpcContext } from "#@/lib/context/types";

type NodeRuntime = {
  broadcastSignals: (keys: string[]) => void;
  files: OrpcContextMediaBucket;
  redis: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
  };
  agentWorkerUrl: string | undefined;
};

type HonoBindings = Record<string, unknown>;

export type OrpcContextBindings = HonoBindings;

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function createContext<TEnv extends { Bindings: HonoBindings }>({
  context,
  logger,
  runtime,
  session: resolvedSession
}: {
  context: HonoContext<TEnv>;
  logger: RequestLogger;
  runtime: NodeRuntime;
  /** Pass a session the caller already resolved to skip a second lookup. */
  session?: AuthSession;
}): Promise<OrpcContext> {
  const headers = context.req.raw.headers;
  const viaApiKey = headers.has("x-api-key");

  // Host for custom-domain public portfolio resolution.
  // Prefer x-forwarded-host only when a trusted reverse proxy sets it (documented
  // operator note). Fall back to Host. Strip port for storage-compatible form.
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const requestHost = headers.get("host")?.trim() ?? "";
  const rawHost =
    forwardedHost.length > 0 ? forwardedHost : requestHost.length > 0 ? requestHost : null;
  const host = rawHost
    ? rawHost.includes(":") && !rawHost.startsWith("[")
      ? (rawHost.split(":")[0] ?? rawHost)
      : rawHost
    : null;

  // Session lookup must not take down public RPCs when the pool is briefly wedged.
  // Protected procedures still fail closed via their own session checks.
  let session: AuthSession = null;
  if (resolvedSession !== undefined) {
    session = resolvedSession;
  } else {
    try {
      session = await auth.api.getSession({ headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`getSession failed (continuing unauthenticated): ${message}`);
      session = null;
    }
  }

  /**
   * Per-tenant GitHub: only resolve credentials for the **session user**.
   * Public portfolio GitHub is scoped per username in github.router
   * via `resolvePublicGitHubSourceForUser` — never a global "first owner".
   */
  let sessionOAuthToken: string | null = null;
  let sessionUserSource: Awaited<ReturnType<typeof resolvePublicGitHubSourceForUser>> = {
    isConfigured: false as const,
    reason: "missing_github_configuration" as const
  };

  if (session?.user?.id) {
    if (!viaApiKey) {
      try {
        const tokens = await auth.api.getAccessToken({
          body: { providerId: "github" },
          headers
        });
        sessionOAuthToken = tokens.accessToken ?? null;
      } catch {
        // Session may lack GitHub link; private GitHub RPCs fail closed.
      }
    }

    try {
      sessionUserSource = await resolvePublicGitHubSourceForUser(session.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`resolvePublicGitHubSourceForUser failed: ${message}`);
    }
  }

  type ConfiguredSource = Extract<
    Awaited<ReturnType<typeof resolvePublicGitHubSourceForUser>>,
    { isConfigured: true }
  >;

  const sessionConfigured: ConfiguredSource | undefined = sessionUserSource.isConfigured
    ? sessionUserSource
    : undefined;

  /**
   * Private Octokit source (detect-stacks, privateGet*, dashboard GitHub).
   *
   * Prefer DB-resolved source (`resolvePublicGitHubSourceForUser`) — it refreshes
   * expired **and revoked** tokens (validates with GET /user) and knows the
   * GitHub login. Fall back to Better Auth's live `getAccessToken` only when
   * the DB path is unavailable (e.g. first request after link before config row),
   * and only after validating the live token with GET /user.
   */
  let liveOAuthFallback: ConfiguredSource | undefined;
  if (
    !sessionUserSource.isConfigured &&
    sessionUserSource.reason === "missing_github_configuration" &&
    sessionOAuthToken &&
    session?.user?.id
  ) {
    const login = await validateGitHubAccessToken(sessionOAuthToken);
    if (login) {
      liveOAuthFallback = {
        isConfigured: true,
        owner: login,
        token: sessionOAuthToken,
        userId: session.user.id
      };
    }
  }
  const privateSource: ConfiguredSource | undefined = sessionConfigured ?? liveOAuthFallback;

  // Prefer private working source; otherwise surface the resolve reason (missing vs invalid).
  const githubSource =
    privateSource ??
    (!sessionUserSource.isConfigured
      ? sessionUserSource
      : ({
          isConfigured: false as const,
          reason: "missing_github_configuration" as const
        } as const));

  return {
    github: {
      binding: {
        kv: createRedisCacheAdapter(runtime.redis),
        broadcast: runtime.broadcastSignals
      },
      privateOctokit: createGitHubOctokit(privateSource),
      publicOctokit: createGitHubOctokit(sessionConfigured),
      source: githubSource
    },
    logger,
    session,
    mediaBucket: runtime.files,
    agentWorker: createAgentWorker({
      AGENT_WORKER_URL: runtime.agentWorkerUrl,
      // MastraAuthBetterAuth: forward Better Auth session (cookie/Bearer or session.token).
      sessionToken: await resolveAgentSessionToken({
        headers,
        sessionToken:
          typeof session?.session === "object" &&
          session.session !== null &&
          "token" in session.session &&
          typeof (session.session as { token?: unknown }).token === "string"
            ? (session.session as { token: string }).token
            : null
      })
    }),
    host
  };
}
