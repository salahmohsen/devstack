import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

/**
 * After auth, never bounce back into guest routes (sign-in / create-account).
 * Only same-origin relative paths are allowed.
 */
function resolveLoggedInRedirect(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw === "/sign-in" || raw.startsWith("/sign-in/")) return "/dashboard";
  return raw;
}

export const Route = createFileRoute("/(root-layout)/(guest)/sign-in")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData({
      ...getAuthUserQueryOptions(),
      revalidateIfStale: true
    });

    if (user) {
      const search = location.search as { redirect?: string };
      const target = resolveLoggedInRedirect(search.redirect);
      // href supports arbitrary same-app paths; known dashboard uses typed `to`.
      if (target === "/dashboard") {
        throw redirect({ to: "/dashboard" });
      }
      throw redirect({ href: target });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
