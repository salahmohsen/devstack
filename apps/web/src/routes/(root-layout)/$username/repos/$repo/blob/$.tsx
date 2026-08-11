import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$username/repos/$repo/blob/$")({
  ssr: true,
  component: GithubRepoBlobRoutePage
});

function GithubRepoBlobRoutePage() {
  const { _splat, username, repo } = Route.useParams();
  return (
    <GithubRepoPage
      username={username}
      pathUsername={username}
      repo={repo}
      routeSplat={_splat}
      view="blob"
    />
  );
}
