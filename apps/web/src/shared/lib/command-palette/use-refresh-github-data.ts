import { useCallback, useRef } from "react";

import { client } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useRefreshGitHubData() {
  const inFlightRef = useRef<Promise<void> | null>(null);

  return useCallback(() => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const task = (async () => {
      const result = await client.private.github.clearViewerCache();
      if (!result.ok) {
        throw new Error("You need to be signed in to refresh data.");
      }
      window.location.reload();
    })();

    inFlightRef.current = task
      .catch(() => undefined)
      .finally(() => {
        inFlightRef.current = null;
      });

    return inFlightRef.current;
  }, []);
}
