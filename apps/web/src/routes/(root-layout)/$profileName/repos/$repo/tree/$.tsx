import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$profileName/repos/$repo/tree/$")({
  ssr: true,
  component: GithubRepoTreeRoutePage
});

function GithubRepoTreeRoutePage() {
  const { _splat, profileName, repo } = Route.useParams();
  return (
    <GithubRepoPage
      profileName={profileName}
      pathProfileName={profileName}
      repo={repo}
      routeSplat={_splat}
      view="tree"
    />
  );
}
