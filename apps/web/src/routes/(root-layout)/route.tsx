import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { isCustomDomainHost, primaryAppUrl } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";

import { RootLayout } from "@/widgets/layout";

/** Paths that must stay on the primary app origin (not custom-domain Host). */
function isPrimaryOnlyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/playground")
  );
}

export const Route = createFileRoute("/(root-layout)")({
  beforeLoad: ({ location }) => {
    const host = getRequestHostname();
    if (!host || !isCustomDomainHost(host)) {
      return;
    }

    if (isPrimaryOnlyPath(location.pathname)) {
      const target = primaryAppUrl(`${location.pathname}${location.searchStr || ""}`);
      throw redirect({
        href: target
      });
    }
  },
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
