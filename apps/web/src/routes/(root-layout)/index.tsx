import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { CommunityLandingPage } from "@/pages/community-landing";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/")({
  ssr: true,
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/"
      },
      description:
        "Open-source, self-hostable personal hub. Public portfolios live at /{profileName}.",
      title: appConfig.site.shortName
    }),
  component: CommunityLandingPage
});
