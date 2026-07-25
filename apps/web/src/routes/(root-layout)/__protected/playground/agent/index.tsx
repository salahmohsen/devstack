import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { AgentChatPage } from "@/pages/agent";

export const Route = createFileRoute("/(root-layout)/__protected/playground/agent/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/playground/agent"
      },
      description: "Internal playground for testing the Mastra agent chat integration.",
      robots: {
        follow: false,
        index: false
      },
      title: "Agent Playground"
    }),
  component: AgentChatPage
});
