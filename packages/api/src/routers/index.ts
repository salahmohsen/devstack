import { type RouterClient } from "@orpc/server";

import { agentRouter } from "#@/routers/agent.router";
import { portfolioContactRouter } from "#@/routers/contact.router";
import { experiencesRouter } from "#@/routers/experiences.router";
import { githubRouter } from "#@/routers/github.router";
import { healthRouter } from "#@/routers/health.router";
import { inviteRouter } from "#@/routers/invite.router";
import { onboardingRouter } from "#@/routers/onboarding.router";
import { PortfolioRouter } from "#@/routers/portfolio.router";
import { profileRouter } from "#@/routers/profile.router";
import { projectsRouter } from "#@/routers/projects.router";
import { resumeRouter } from "#@/routers/resume.router";
import { stacksRouter } from "#@/routers/stacks.router";

export const appRouter = {
  agent: agentRouter,
  github: githubRouter,
  health: healthRouter,
  experiences: experiencesRouter,
  projects: projectsRouter,
  stacks: stacksRouter,
  contact: portfolioContactRouter,
  portfolio: PortfolioRouter,
  profile: profileRouter,
  resume: resumeRouter,
  onboarding: onboardingRouter,
  invite: inviteRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
