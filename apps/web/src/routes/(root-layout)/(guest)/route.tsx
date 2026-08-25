import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

/**
 * After auth, never bounce back into guest routes (sign-in / sign-up).
 * Only same-origin relative paths are allowed.
 */
function resolveLoggedInRedirect(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "/dashboard/agent";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard/agent";
  if (raw === "/sign-in" || raw.startsWith("/sign-in/")) return "/dashboard/agent";
  if (raw === "/sign-up" || raw.startsWith("/sign-up/")) return "/dashboard/agent";
  if (raw === "/dashboard" || raw === "/dashboard/") return "/dashboard/agent";
  return raw;
}

export const Route = createFileRoute("/(root-layout)/(guest)")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData({
      ...getAuthUserQueryOptions(),
      revalidateIfStale: true
    });

    if (user) {
      const search = location.search as { redirect?: string };
      const target = resolveLoggedInRedirect(search.redirect);
      // href supports arbitrary same-app paths; known agent home uses typed `to`.
      if (target === "/dashboard/agent") {
        throw redirect({ to: "/dashboard/agent" });
      }
      throw redirect({ href: target });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden">
      {/* Soft ambient glow — decorative only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,--theme(--color-primary/8%),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,--theme(--color-primary/12%),transparent_50%)]"
      />
      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </div>
  );
}
