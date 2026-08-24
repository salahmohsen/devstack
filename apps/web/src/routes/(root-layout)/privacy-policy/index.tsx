import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { PrivacyPolicyPage } from "@/pages/privacy-policy";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/privacy-policy/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/privacy-policy"
      },
      description: `How ${appConfig.site.shortName} collects, uses, and protects account and usage information on this install.`,
      title: "Privacy Policy"
    }),
  component: PrivacyPolicyPage
});
