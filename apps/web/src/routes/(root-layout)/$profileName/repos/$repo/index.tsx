import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$profileName/repos/$repo/")({
  ssr: true,
  component: GithubRepoRoutePage
});

function GithubRepoRoutePage() {
  const { profileName, repo } = Route.useParams();
  return <GithubRepoPage repo={repo} profileName={profileName} />;
}
