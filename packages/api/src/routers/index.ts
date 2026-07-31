import { type RouterClient } from "@orpc/server";

import { agentRouter } from "#@/routers/agent.router";
import { aiSettingsRouter } from "#@/routers/ai-settings.router";
import { applicationsRouter } from "#@/routers/applications.router";
import { connectionsRouter } from "#@/routers/connections.router";
import { portfolioContactRouter } from "#@/routers/contact.router";
import { domainRouter } from "#@/routers/domain.router";
import { experiencesRouter } from "#@/routers/experiences.router";
import { githubRouter } from "#@/routers/github.router";
import { healthRouter } from "#@/routers/health.router";
import { inviteRouter } from "#@/routers/invite.router";
import { jobPreferenceRouter } from "#@/routers/job-preference.router";
import { mailSettingsRouter } from "#@/routers/mail-settings.router";
import { mailSmartRulesRouter } from "#@/routers/mail-smart-rules.router";
import { mailRouter } from "#@/routers/mail.router";
import { notificationSettingsRouter } from "#@/routers/notification-settings.router";
import { notificationsRouter } from "#@/routers/notifications.router";
import { onboardingRouter } from "#@/routers/onboarding.router";
import { PortfolioRouter } from "#@/routers/portfolio.router";
import { profileRouter } from "#@/routers/profile.router";
import { projectsRouter } from "#@/routers/projects.router";
import { resumeRouter } from "#@/routers/resume.router";
import { reviewRouter } from "#@/routers/review.router";
import { stacksRouter } from "#@/routers/stacks.router";

export const appRouter = {
  agent: agentRouter,
  aiSettings: aiSettingsRouter,
  applications: applicationsRouter,
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
  invite: inviteRouter,
  jobPreference: jobPreferenceRouter,
  domain: domainRouter,
  connections: connectionsRouter,
  mail: mailRouter,
  mailSettings: mailSettingsRouter,
  mailSmartRules: mailSmartRulesRouter,
  notificationSettings: notificationSettingsRouter,
  notifications: notificationsRouter,
  review: reviewRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
