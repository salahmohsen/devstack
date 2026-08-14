import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { generateAppSeo } from "@/shared/lib/seo";

import { getConnectionsStatusQueryOptions } from "@/features/connections";
import { getJobPreferenceQueryOptions } from "@/features/job-preference";

import { OnboardingPage } from "@/pages/dashboard/onboarding";

const onboardingSearchSchema = z.object({
  step: z.enum(["upload", "review", "jobs", "connect", "done"]).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
  error_description: z.string().optional().catch(undefined)
});

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/onboarding/")({
  validateSearch: zodValidator(onboardingSearchSchema),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getJobPreferenceQueryOptions());
    void context.queryClient.prefetchQuery(getConnectionsStatusQueryOptions());
  },
  head: () =>
    generateAppSeo({
      description: "Import your resume, set job preferences, and connect Gmail and GitHub.",
      robots: {
        follow: false,
        index: false
      },
      title: "Onboarding"
    }),
  component: OnboardingPage
});
