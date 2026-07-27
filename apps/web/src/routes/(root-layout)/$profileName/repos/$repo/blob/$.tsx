import { createFileRoute } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

export const Route = createFileRoute("/(root-layout)/$profileName/repos/$repo/blob/$")({
  ssr: true,
  component: GithubRepoBlobRoutePage
});

function GithubRepoBlobRoutePage() {
  const { _splat, profileName, repo } = Route.useParams();
  return (
    <GithubRepoPage
      profileName={profileName}
      pathProfileName={profileName}
      repo={repo}
      routeSplat={_splat}
      view="blob"
    />
  );
}
