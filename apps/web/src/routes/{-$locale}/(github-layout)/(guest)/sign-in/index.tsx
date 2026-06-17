import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";

import { generateAppSeo } from "@/shared/lib/seo";

import { SignInForm } from "@/features/auth";

import { appConfig } from "@/config/app.config";
import { routeTree } from "@/routeTree.gen";

const guestSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform((val) =>
      validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("__protected"),
        to: val
      })
    )
});

export const Route = createFileRoute("/{-$locale}/(github-layout)/(guest)/sign-in/")({
  validateSearch: zodValidator(guestSearchSchema),

  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/sign-in",
        locale: params.locale
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
  const { redirect } = Route.useSearch();

  return <SignInForm redirectTo={redirect} />;
}
