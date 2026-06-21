import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { PlaygroundPage } from "@/pages/playground";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/playground/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/playground"
      },
      description: `Explore internal demos for images, RPC health checks, toasts, and error handling in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Playground"
    }),
  component: PlaygroundPage
});
