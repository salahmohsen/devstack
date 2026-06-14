import { createFileRoute } from "@tanstack/react-router";

import { GithubConfigPage } from "@/pages/dashboard";

export const Route = createFileRoute("/{-$locale}/(layout)/__protected/dashboard/github-config")({
  component: GithubConfigPage
});
