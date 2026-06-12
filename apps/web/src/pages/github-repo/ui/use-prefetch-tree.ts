import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { type GitHubRepoTreeEntry } from "@tsu-stack/github";

import { getGithubRepoTreeQueryOptions } from "@/pages/github-repo/api/get-github-repo-tree.query";

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 150;

export function usePrefetchTree(
  input: { owner: string; ref: string; repo: string },
  rootEntries: GitHubRepoTreeEntry[] | undefined
) {
  const queryClient = useQueryClient();
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!rootEntries) return;

    const runId = ++runIdRef.current;

    const queue: string[] = [];
    for (const entry of rootEntries) {
      if (entry.type === "dir") {
        queue.push(entry.name);
      }
    }

    let cursor = 0;

    async function processNextBatch() {
      if (runIdRef.current !== runId) return;
      if (cursor >= queue.length) return;

      const batch = queue.slice(cursor, cursor + BATCH_SIZE);
      cursor += batch.length;

      const results = await Promise.all(
        batch.map((path) => {
          const options = getGithubRepoTreeQueryOptions(input.owner, input.repo, input.ref, path);

          if (queryClient.getQueryData(options.queryKey)) {
            return queryClient.getQueryData(options.queryKey) as GitHubRepoTreeEntry[] | undefined;
          }

          return queryClient.fetchQuery(options).catch(() => undefined);
        })
      );

      if (runIdRef.current !== runId) return;

      for (let i = 0; i < batch.length; i++) {
        const parentPath = batch[i];
        const children = results[i];
        if (children) {
          for (const child of children) {
            if (child.type === "dir") {
              queue.push(`${parentPath}/${child.name}`);
            }
          }
        }
      }

      if (cursor < queue.length) {
        setTimeout(processNextBatch, BATCH_DELAY_MS);
      }
    }

    processNextBatch();

    return () => {
      runIdRef.current++;
    };
  }, [rootEntries, input, queryClient]);
}
