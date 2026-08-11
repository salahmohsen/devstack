import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$username/repos/$repo/tree/$")({
  ssr: true,
  component: GithubRepoTreeRoutePage
});

function GithubRepoTreeRoutePage() {
  const { _splat, username, repo } = Route.useParams();
  return (
    <GithubRepoPage
      username={username}
      pathUsername={username}
      repo={repo}
      routeSplat={_splat}
      view="tree"
    />
  );
}
