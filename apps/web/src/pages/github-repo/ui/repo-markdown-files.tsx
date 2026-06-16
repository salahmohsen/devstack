import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type GitHubRepoTreeEntry } from "@tsu-stack/github/types";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Markdown } from "@/shared/ui/markdown";

import { getGithubRepoFileContentQueryOptions } from "@/pages/github-repo/api/get-github-repo-file-content.query";

const KNOWN_MD_FILES = [
  "README.md",
  "readme.md",
  "README",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "SECURITY.md",
  "CHANGELOG.md"
];

const TAB_LABELS: Record<string, string> = {
  "README.md": "README",
  "readme.md": "README",
  README: "README",
  "CODE_OF_CONDUCT.md": "Code of conduct",
  "CONTRIBUTING.md": "Contributing",
  LICENSE: "License",
  "LICENSE.md": "License",
  "LICENSE.txt": "License",
  "SECURITY.md": "Security",
  "CHANGELOG.md": "Changelog"
};

export function RepoMarkdownFiles({
  entries,
  repo,
  currentRef
}: {
  entries: GitHubRepoTreeEntry[];
  repo: string;
  currentRef: string;
}) {
  const mdFiles = useMemo(() => {
    const fileNames = new Set(entries.map((e) => e.name));
    return KNOWN_MD_FILES.filter((name) => fileNames.has(name));
  }, [entries]);

  const queryClient = useQueryClient();
  useEffect(() => {
    for (const file of mdFiles) {
      void queryClient.prefetchQuery(getGithubRepoFileContentQueryOptions(repo, currentRef, file));
    }
  }, [queryClient, mdFiles, repo, currentRef]);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const selectedFile = activeTab ?? mdFiles[0] ?? null;

  if (mdFiles.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {mdFiles.map((file) => (
          <button
            key={file}
            type="button"
            onClick={() => setActiveTab(file)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              file === selectedFile
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:bg-white/4 hover:text-base-200"
            )}
          >
            {TAB_LABELS[file] ?? file}
          </button>
        ))}
      </div>

      {selectedFile && (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <MarkdownFileContent repo={repo} path={selectedFile} currentRef={currentRef} />
        </div>
      )}
    </div>
  );
}

function MarkdownFileContent({
  repo,
  path,
  currentRef
}: {
  repo: string;
  path: string;
  currentRef: string;
}) {
  const contentQuery = useQuery({
    ...getGithubRepoFileContentQueryOptions(repo, currentRef, path),
    placeholderData: (previous) => previous
  });

  const resolveAssetUrl = useCallback(
    (url: string) => resolveGitHubMarkdownAssetUrl({ repo, ref: currentRef, path }, url),
    [repo, currentRef, path]
  );

  if (contentQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[90%] rounded-md" />
        <Skeleton className="h-4 w-[75%] rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[60%] rounded-md" />
      </div>
    );
  }

  if (!contentQuery.data) {
    return <div className="p-6 text-sm text-base-500">Unable to load file content.</div>;
  }

  return (
    <div className="px-6 py-16">
      <Markdown className="mx-auto max-w-3xl" resolveAssetUrl={resolveAssetUrl}>
        {contentQuery.data}
      </Markdown>
    </div>
  );
}

const ABSOLUTE_MARKDOWN_URL_RE = /^[a-z][a-z\d+\-.]*:|^\/\//iu;

function resolveGitHubMarkdownAssetUrl(
  { repo, ref, path }: { repo: string; ref: string; path: string },
  url: string
) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || trimmedUrl.startsWith("#") || ABSOLUTE_MARKDOWN_URL_RE.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const rootUrl = `https://github.com/salahmohsen/${encodeURIComponent(repo)}/raw/${encodePath(ref)}/`;
  const directoryPath = encodePath(getDirectoryPath(path));
  const baseUrl = trimmedUrl.startsWith("/")
    ? rootUrl
    : directoryPath
      ? new URL(`${directoryPath}/`, rootUrl).toString()
      : rootUrl;

  return new URL(trimmedUrl.replace(/^\/+/u, ""), baseUrl).toString();
}

function getDirectoryPath(path: string) {
  const lastSlashIndex = path.lastIndexOf("/");
  return lastSlashIndex === -1 ? "" : path.slice(0, lastSlashIndex);
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
