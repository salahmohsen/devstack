import { createFileRoute, type NavigateOptions } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { generateAppSeo } from "@/shared/lib/seo";

import { SignInForm } from "@/features/auth";

import { appConfig } from "@/config/app.config";

const guestSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  // Better Auth OAuth callback failures append these (`redirectOnError`).
  error: z.string().optional().catch(undefined),
  error_description: z.string().optional().catch(undefined)
});

export const Route = createFileRoute("/(root-layout)/(guest)/sign-in/")({
  validateSearch: zodValidator(guestSearchSchema),

  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/sign-in"
      },
      description: `Sign in to access your ${appConfig.site.shortName} account and manage your saved application data.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Sign In"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { redirect, error, error_description: errorDescription } = Route.useSearch();

  return (
    <SignInForm
      oauthError={error}
      oauthErrorDescription={errorDescription}
      redirectTo={redirect as NavigateOptions["to"]}
    />
  );
}
