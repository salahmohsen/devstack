import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { OnboardingPage } from "@/pages/dashboard/onboarding";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/onboarding/")({
  head: () =>
    generateAppSeo({
      description: "Import portfolio data from a resume PDF.",
      robots: {
        follow: false,
        index: false
      },
      title: "Onboarding"
    }),
  component: OnboardingPage
});
