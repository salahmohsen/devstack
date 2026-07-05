import { type RouterClient } from "@orpc/server";

import { portfolioContactRouter } from "#@/routers/contact.router";
import { portfolioExperiencesRouter } from "#@/routers/experiences.router";
import { githubConfigRouter } from "#@/routers/github-config.router";
import { githubRouter } from "#@/routers/github.router";
import { healthRouter } from "#@/routers/health.router";
import { portfolioPortfolioRouter } from "#@/routers/portfolio.router";
import { profileRouter } from "#@/routers/profile.router";
import { portfolioProjectsRouter } from "#@/routers/projects.router";
import { portfolioStacksRouter } from "#@/routers/stacks.router";

export const appRouter = {
  githubConfig: githubConfigRouter,
  github: githubRouter,
  health: healthRouter,
  portfolio: {
    experiences: portfolioExperiencesRouter,
    projects: portfolioProjectsRouter,
    stacks: portfolioStacksRouter,
    contact: portfolioContactRouter,
    portfolio: portfolioPortfolioRouter
  },
  profile: profileRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
