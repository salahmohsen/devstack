import { type RouterClient } from "@orpc/server";

import { agentRouter } from "#@/routers/agent.router";
import { portfolioContactRouter } from "#@/routers/contact.router";
import { experiencesRouter } from "#@/routers/experiences.router";
import { githubConfigRouter } from "#@/routers/github-config.router";
import { githubRouter } from "#@/routers/github.router";
import { healthRouter } from "#@/routers/health.router";
import { PortfolioRouter } from "#@/routers/portfolio.router";
import { profileRouter } from "#@/routers/profile.router";
import { projectsRouter } from "#@/routers/projects.router";
import { resumeRouter } from "#@/routers/resume.router";
import { stacksRouter } from "#@/routers/stacks.router";

export const appRouter = {
  agent: agentRouter,
  githubConfig: githubConfigRouter,
  github: githubRouter,
  health: healthRouter,
  experiences: experiencesRouter,
  projects: projectsRouter,
  stacks: stacksRouter,
  contact: portfolioContactRouter,
  portfolio: PortfolioRouter,
  profile: profileRouter,
  resume: resumeRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
