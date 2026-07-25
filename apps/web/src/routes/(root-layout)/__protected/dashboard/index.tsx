import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardHomePage } from "@/pages/dashboard/home/dashboard-home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/dashboard"
      },
      description: `Your personal hub — ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Dashboard"
    }),
  component: DashboardHomePage
});
