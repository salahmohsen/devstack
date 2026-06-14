import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardPage } from "@/pages/dashboard";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/{-$locale}/(layout)/__protected/dashboard/")({
  beforeLoad: ({ context }) => {
    void context.queryClient.ensureQueryData(orpc.appSettings.get.queryOptions());
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/dashboard",
        locale: params.locale
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
