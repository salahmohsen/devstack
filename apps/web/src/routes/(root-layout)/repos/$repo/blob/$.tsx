import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

const parentRoute = getRouteApi("/(root-layout)/repos/$repo");

export const Route = createFileRoute("/(root-layout)/repos/$repo/blob/$")({
  ssr: true,
  component: GithubRepoBlobRoutePage
});

function GithubRepoBlobRoutePage() {
  const { _splat, repo } = Route.useParams();
  const parentData = parentRoute.useLoaderData() as { username: string };

  return (
    <GithubRepoPage
      username={parentData.username}
      pathUsername={null}
      repo={repo}
      routeSplat={_splat}
      view="blob"
    />
  );
}
