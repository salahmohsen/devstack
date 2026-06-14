import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(layout)/$repo/blob/$")({
  ssr: true,
  component: GithubRepoBlobRoutePage
});

function GithubRepoBlobRoutePage() {
  const { _splat, repo } = Route.useParams();

  return <GithubRepoPage repo={repo} routeSplat={_splat} view="blob" />;
}
