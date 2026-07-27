import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { GithubRepoPage } from "@/pages/github-repo";

const parentRoute = getRouteApi("/(root-layout)/repos/$repo");

export const Route = createFileRoute("/(root-layout)/repos/$repo/")({
  ssr: true,
  component: GithubRepoRoutePage
});

function GithubRepoRoutePage() {
  const { repo } = Route.useParams();
  const parentData = parentRoute.useLoaderData() as {
    profileName: string;
    pathProfileName: string | null;
  };

  return <GithubRepoPage repo={repo} profileName={parentData.profileName} pathProfileName={null} />;
}
