import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";

import { generateAppSeo } from "@/shared/lib/seo";

import { CreateAnAccountForm } from "@/features/auth";

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

export const Route = createFileRoute(
  "/{-$locale}/(root-layout)/(guest)/sign-in/create-an-account/"
)({
  validateSearch: zodValidator(guestSearchSchema),

  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/create-an-account",
        locale: params.locale
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
  const { redirect } = Route.useSearch();

  return <CreateAnAccountForm redirectTo={redirect} />;
}
