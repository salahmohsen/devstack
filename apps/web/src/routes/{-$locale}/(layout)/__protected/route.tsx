import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useLocation } from "@tsu-stack/i18n/tanstack-start/hooks/use-location";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { getRouteTreePathsLocalized } from "@tsu-stack/i18n/tanstack-start/lib/get-route-tree-paths-localized";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@tsu-stack/ui/components/breadcrumb";
import { Separator } from "@tsu-stack/ui/components/separator";
import { SidebarInset, SidebarTrigger } from "@tsu-stack/ui/components/sidebar";

import { useLogger } from "@/shared/providers/logger-provider";
import { AppSidebar } from "@/shared/ui/app-sidebar";

import { routeTree } from "@/routeTree.gen";

/**
 * Checks if a given pathname is a guest route (sign-in, create-an-account, etc.)
 * We add this because the useEffect may run after the beforeLoad redirect when navigating to a (guest) route
 * which would cause the redirect param to be set to the default since it performs a brand new navigation in /sign-in
 */
function isGuestRoute(pathname: string): boolean {
  const routes = getRouteTreePathsLocalized(routeTree);
  const matchingRoute = routes.find((route) => route.path === pathname);
  return matchingRoute ? matchingRoute.id.includes("(guest)") : false;
}

export const Route = createFileRoute("/{-$locale}/(layout)/__protected")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData({
      ...getAuthUserQueryOptions(),
      revalidateIfStale: true
    });

    if (!user) {
      const currentHref = stripLocalePrefix(location.href);
      const redirectTo = validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(auth)"),
        to: currentHref
      });

      throw redirect({
        search: {
          redirect: redirectTo
        },
        to: "/sign-in"
      });
    }

    // Retype the Route context to include a non-null user prop
    return { user };
  },
  component: RequiresAuthLayout
});

function RequiresAuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useQuery(getAuthUserQueryOptions());
  const logger = useLogger();

  useEffect(() => {
    if (user === null) {
      if (isGuestRoute(location.pathname)) {
        return;
      }

      const redirectTo = validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: stripLocalePrefix(location.href)
      });

      void navigate({
        search: {
          redirect: redirectTo
        },
        to: "/sign-in"
      });
    }
  }, [user, navigate, location.href, location.pathname, logger]);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator className="mr-2 h-4 opacity-60" orientation="vertical" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link to="/dashboard" />}>Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>TITTTTLE</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
