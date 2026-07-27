import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

const parentRoute = getRouteApi("/(root-layout)/repos/$repo");

export const Route = createFileRoute("/(root-layout)/repos/$repo/tree/$")({
  ssr: true,
  component: GithubRepoTreeRoutePage
});

function GithubRepoTreeRoutePage() {
  const { _splat, repo } = Route.useParams();
  const parentData = parentRoute.useLoaderData() as { profileName: string };

  return (
    <GithubRepoPage
      profileName={parentData.profileName}
      pathProfileName={null}
      repo={repo}
      routeSplat={_splat}
      view="tree"
    />
  );
}
