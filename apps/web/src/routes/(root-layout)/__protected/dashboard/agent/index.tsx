import { createFileRoute } from "@tanstack/react-router";

import { DASHBOARD_AGENT_PATH } from "@/shared/lib/dashboard-paths";
import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardHomePage } from "@/pages/dashboard/home/dashboard-home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/agent/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: DASHBOARD_AGENT_PATH
      },
      description: `Your personal hub — ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Agent"
    }),
  component: DashboardHomePage
});
