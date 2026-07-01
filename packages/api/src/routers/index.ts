import { type RouterClient } from "@orpc/server";

import { githubConfigRouter } from "#@/routers/github-config/index";
import { githubRouter } from "#@/routers/github/index";
import { healthRouter } from "#@/routers/health/index";
import { portfolioRouter } from "#@/routers/portfolio/index";
import { profileRouter } from "#@/routers/profile/index";

export const appRouter = {
  githubConfig: githubConfigRouter,
  github: githubRouter,
  health: healthRouter,
  portfolio: portfolioRouter,
  profile: profileRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
