import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { type GitHubRuntimeBindings } from "@tsu-stack/github";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { type OrpcContext } from "#@/lib/context/types";

type HonoBindings = {
  GITHUB_CACHE_KV?: GitHubRuntimeBindings["kv"];
  GITHUB_SIGNAL_RELAY?: GitHubRuntimeBindings["signalRelay"];
};

export type OrpcContextBindings = HonoBindings;

export async function createContext<TEnv extends { Bindings: HonoBindings }>({
  context,
  logger
}: {
  context: HonoContext<TEnv>;
  logger: RequestLogger;
}): Promise<OrpcContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers
  });
  return {
    github: {
      executionContext: context.executionCtx,
      kv: context.env.GITHUB_CACHE_KV,
      signalRelay: context.env.GITHUB_SIGNAL_RELAY
    },
    logger,
    session
  };
}
