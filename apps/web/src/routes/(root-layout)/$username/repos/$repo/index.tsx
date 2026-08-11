import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$username/repos/$repo/")({
  ssr: true,
  component: GithubRepoRoutePage
});

function GithubRepoRoutePage() {
  const { username, repo } = Route.useParams();
  return <GithubRepoPage repo={repo} username={username} />;
}
