import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardPage } from "@/pages/dashboard";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/")({
  beforeLoad: ({ context }) => {
    void context.queryClient.ensureQueryData(orpcQueryClient.githubConfig.get.queryOptions());
  },
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/dashboard"
      },
      description: `View your account dashboard and protected application data in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Dashboard"
    }),
  component: DashboardPage
});
