import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardHomePage } from "@/pages/dashboard/home/dashboard-home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/")({
  beforeLoad: ({ context }) => {
    void context.queryClient.ensureQueryData(orpcQueryClient.githubConfig.get.queryOptions());
  },
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
    void queryClient.prefetchQuery(orpcQueryClient.portfolio.projects.list.queryOptions());
  },
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/dashboard"
      },
      description: `Manage your resume content in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Dashboard"
    }),
  component: DashboardHomePage
});
