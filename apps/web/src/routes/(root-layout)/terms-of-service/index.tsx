import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { TermsOfServicePage } from "@/pages/terms-of-service";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/terms-of-service/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/terms-of-service"
      },
      description: `Review the rules, responsibilities, and terms for using ${appConfig.site.shortName}.`,
      title: "Terms of Service"
    }),
  component: TermsOfServicePage
});
