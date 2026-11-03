import { type RouterClient } from "@orpc/server";

import { adminRouter } from "#@/routers/admin.router";
import { agentRouter } from "#@/routers/agent.router";
import { aiSettingsRouter } from "#@/routers/ai-settings.router";
import { applicationsRouter } from "#@/routers/applications.router";
import { certificationsRouter } from "#@/routers/certifications.router";
import { chatgptPlanRouter } from "#@/routers/chatgpt-plan.router";
import { connectionsRouter } from "#@/routers/connections.router";
import { portfolioContactRouter } from "#@/routers/contact.router";
import { domainRouter } from "#@/routers/domain.router";
import { educationsRouter } from "#@/routers/educations.router";
import { experiencesRouter } from "#@/routers/experiences.router";
import { githubRouter } from "#@/routers/github.router";
import { healthRouter } from "#@/routers/health.router";
import { jobDiscoveryRouter } from "#@/routers/job-discovery.router";
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
import { searchRouter } from "#@/routers/search.router";
import { signupPolicyRouter } from "#@/routers/signup-policy.router";
import { stacksRouter } from "#@/routers/stacks.router";

export const appRouter = {
  agent: agentRouter,
  aiSettings: aiSettingsRouter,
  chatgptPlan: chatgptPlanRouter,
  applications: applicationsRouter,
  github: githubRouter,
  health: healthRouter,
  experiences: experiencesRouter,
  educations: educationsRouter,
  certifications: certificationsRouter,
  projects: projectsRouter,
  stacks: stacksRouter,
  contact: portfolioContactRouter,
  portfolio: PortfolioRouter,
  profile: profileRouter,
  resume: resumeRouter,
  search: searchRouter,
  onboarding: onboardingRouter,
  admin: adminRouter,
  signupPolicy: signupPolicyRouter,
  jobDiscovery: jobDiscoveryRouter,
  jobPreference: jobPreferenceRouter,
  domain: domainRouter,
  connections: connectionsRouter,
  mail: mailRouter,
  mailSettings: mailSettingsRouter,
  mailSmartRules: mailSmartRulesRouter,
  notificationSettings: notificationSettingsRouter,
  notifications: notificationsRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
