import { type RouterClient } from "@orpc/server";

import { githubConfigRouter } from "#@/routers/github-config/index";
import { githubRouter } from "#@/routers/github/index";
import { healthRouter } from "#@/routers/health/index";
import { identityRouter } from "#@/routers/identity/index";
import { portfolioRouter } from "#@/routers/portfolio/index";

export const appRouter = {
  githubConfig: githubConfigRouter,
  github: githubRouter,
  health: healthRouter,
  identity: identityRouter,
  portfolio: portfolioRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
