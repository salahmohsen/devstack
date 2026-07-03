import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { type GitHubRepoTreeEntry } from "@tsu-stack/github/types";

import { getGithubRepoTreeQueryOptions } from "@/pages/github-repo/api/get-github-repo-tree.query";

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 150;

/**
 * Progressively prefetch all directory subtrees in BFS order.
 * Starts from the root entries and walks deeper level by level,
 * fetching BATCH_SIZE directories at a time with a small delay
 * between batches to avoid flooding the network.
 */
export function usePrefetchTree(
  input: { ref: string; repo: string },
  rootEntries: GitHubRepoTreeEntry[] | undefined,
  isPrivate = false
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
        // oxlint-disable-next-line typescript/await-thenable
        batch.map((path) => {
          const options = getGithubRepoTreeQueryOptions(input.repo, input.ref, path, isPrivate);

          // Skip if already cached
          if (queryClient.getQueryData(options.queryKey)) {
            return queryClient.getQueryData(options.queryKey) as GitHubRepoTreeEntry[] | undefined;
          }

          return queryClient.fetchQuery(options).catch(() => undefined);
        })
      );

      if (runIdRef.current !== runId) return;

      // Enqueue child directories discovered in this batch
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

      // Schedule next batch
      if (cursor < queue.length) {
        setTimeout(processNextBatch, BATCH_DELAY_MS);
      }
    }

    void processNextBatch();

    return () => {
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      runIdRef.current++;
    };
  }, [rootEntries, input, queryClient, isPrivate]);
}
