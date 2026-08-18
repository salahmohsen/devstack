import geistMonoLatin from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import geistVariableLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { type QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { lazy, Suspense } from "react";

import {
  getAuthUserQueryOptions,
  type AuthQueryResult
} from "@tsu-stack/auth/react/tanstack-start/queries";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ThemeProvider } from "@tsu-stack/ui/components/theme-switcher";
import { TooltipProvider } from "@tsu-stack/ui/components/tooltip";

import { generateAppSeo } from "@/shared/lib/seo";
import { ProgressProvider } from "@/shared/providers/progress.provider";
import appCss from "@/shared/styles/app.css?url";
import { AiJobIslandHost } from "@/shared/ui/ai-job-island-host";
import { AppToaster } from "@/shared/ui/app-toaster";
import { CuelumeProvider } from "@/shared/ui/cuelume-provider";

import { DefaultErrorPage } from "@/pages/default-error";

const AppTanStackDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@/shared/ui/tanstack-devtools").then((m) => {
        return { default: m.AppTanStackDevtools };
      })
    )
  : () => null;

// Root route with shared context for the entire app, inject them in router.tsx
type RouterAppContext = {
  queryClient: QueryClient;
  user: AuthQueryResult;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  errorComponent: DefaultErrorPage,
  shellComponent: RootDocument,
  // Consider removing this if you don't need the auth state everywhere
  // An example of when to KEEP it is when you conditionally display a sign-up button in the header based on the auth state
  beforeLoad: async ({ context, preload }) => {
    // Don't prefetch during preload to prevent spamming the server with getSession requests
    if (!preload) {
      // Prefetch (don't await) the user data on app load to have it ready for any route that needs it, and to set the auth state early
      void context.queryClient.prefetchQuery(getAuthUserQueryOptions());
    }
  },
  head: () => {
    const rootSeo = generateAppSeo({
      includeDocumentMeta: true
    });

    return {
      links: [
        ...(rootSeo.links ?? []),
        {
          href: `${ENV_WEB_ISOMORPHIC.VITE_WEB_URL}/favicon.ico`,
          rel: "icon"
        },
        {
          href: `${ENV_WEB_ISOMORPHIC.VITE_WEB_URL}/sitemap.xml`,
          rel: "sitemap",
          type: "application/xml"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistVariableLatin,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistMonoLatin,
          crossOrigin: "anonymous"
        },
        { href: appCss, rel: "stylesheet" }
      ],
      meta: [...(rootSeo.meta ?? [])]
    };
  }
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />

        {/* {import.meta.env.DEV && <script type="module" src="/@vite-plugin-checker-runtime-entry" />} */}
      </head>
      <body suppressHydrationWarning>
        {/* We place the progress provider here otherwise we will get "Cannot render a <style> outside the main document" error */}
        <ThemeProvider attribute="class" defaultTheme="dark">
          <TooltipProvider>
            <ProgressProvider>
              <NuqsAdapter>
                <CuelumeProvider />
                {children}
                <AppToaster />
                <AiJobIslandHost />
              </NuqsAdapter>
              {import.meta.env.DEV ? (
                <Suspense fallback={null}>
                  <AppTanStackDevtools />
                </Suspense>
              ) : null}
              <Scripts />
            </ProgressProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
