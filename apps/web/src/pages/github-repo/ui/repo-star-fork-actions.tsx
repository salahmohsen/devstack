import { GitForkIcon, StarIcon } from "@tsu-stack/icons";

type RepoStarForkActionsProps = {
  forkCount: number;
  repoUrl: string;
  stars: number;
};

export function RepoStarForkActions({ forkCount, repoUrl, stars }: RepoStarForkActionsProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-base-400">
      <a
        href={`${repoUrl}/stargazers`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 hover:bg-white/8"
      >
        <StarIcon className="size-4" />
        {stars.toLocaleString()}
      </a>
      <a
        href={`${repoUrl}/forks`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 hover:bg-white/8"
      >
        <GitForkIcon className="size-4" />
        {forkCount.toLocaleString()}
      </a>
    </div>
  );
}
