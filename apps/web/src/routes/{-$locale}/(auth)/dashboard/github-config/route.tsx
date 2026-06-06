import { createFileRoute } from "@tanstack/react-router";

import { GithubConfigPage } from "@/pages/dashboard";

export const Route = createFileRoute("/{-$locale}/(auth)/dashboard/github-config")({
  component: GithubConfigPage
});
