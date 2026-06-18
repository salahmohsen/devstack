import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(github-layout)/$repo/tree/$")({
  ssr: true,
  component: GithubRepoTreeRoutePage
});

function GithubRepoTreeRoutePage() {
  const { _splat, repo } = Route.useParams();

  return <GithubRepoPage repo={repo} routeSplat={_splat} view="tree" />;
}
