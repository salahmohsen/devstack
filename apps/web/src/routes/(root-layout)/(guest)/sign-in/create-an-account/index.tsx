import { createFileRoute, type NavigateOptions } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { generateAppSeo } from "@/shared/lib/seo";

import { CreateAnAccountForm } from "@/features/auth";

import { appConfig } from "@/config/app.config";

const guestSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  invite: z.string().optional().catch(undefined)
});

export const Route = createFileRoute("/(root-layout)/(guest)/sign-in/create-an-account/")({
  validateSearch: zodValidator(guestSearchSchema),

  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/create-an-account"
      },
      description: `Create a ${appConfig.site.shortName} account to save your progress and access personalized features.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Create an Account"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { redirect, invite } = Route.useSearch();

  return (
    <CreateAnAccountForm redirectTo={redirect as NavigateOptions["to"]} inviteCode={invite ?? ""} />
  );
}
