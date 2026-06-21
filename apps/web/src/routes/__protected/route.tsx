import { useQuery } from "@tanstack/react-query";
import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useNavigate
} from "@tanstack/react-router";
import { Suspense, useEffect } from "react";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { useLogger } from "@/shared/providers/logger-provider";
import { DefaultLoader } from "@/shared/ui/default-loader";

function isGuestRoute(pathname: string): boolean {
  return pathname.startsWith("/sign-in");
}

export const Route = createFileRoute("/__protected")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData({
      ...getAuthUserQueryOptions(),
      revalidateIfStale: true
    });

    if (!user) {
      throw redirect({
        search: {
          redirect: location.href
        },
        to: "/sign-in"
      });
    }

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

      void navigate({
        search: {
          redirect: location.href
        },
        to: "/sign-in"
      });
    }
  }, [user, navigate, location.href, location.pathname, logger]);

  return (
    <Suspense fallback={<DefaultLoader className="mx-auto mt-16" />}>
      <Outlet />
    </Suspense>
  );
}
