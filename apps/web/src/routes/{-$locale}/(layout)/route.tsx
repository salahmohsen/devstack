import { Outlet, createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";

import { GithubPublicLayout } from "@/widgets/layout";

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
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: val
      })
    )
});

export const Route = createFileRoute("/{-$locale}/(layout)")({
  validateSearch: zodValidator(guestSearchSchema),

  component: () => (
    <GithubPublicLayout>
      <Outlet />
    </GithubPublicLayout>
  )
});
