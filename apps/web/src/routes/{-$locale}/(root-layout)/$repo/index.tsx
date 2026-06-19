import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(root-layout)/$repo/")({
  ssr: true,
  component: GithubRepoRoutePage
});

function GithubRepoRoutePage() {
  const { repo } = Route.useParams();

  return <GithubRepoPage repo={repo} />;
}
