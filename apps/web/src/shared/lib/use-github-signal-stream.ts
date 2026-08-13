import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { type Socket, io } from "socket.io-client";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";

import { debug } from "@/lib/debug";
import { type GitHubQueryScope, githubQueryKeys } from "@/lib/github.query";

export type GitHubSignalStreamTarget = {
  queryKey: QueryKey;
  signalKeys: readonly string[];
};

type SignalMessage = {
  type: "signals";
  keys: string[];
};

type GitHubSignalStreamStatus = "connecting" | "connected" | "disconnected";

function isSignalMessage(data: unknown): data is SignalMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "signals" &&
    "keys" in data &&
    Array.isArray(data.keys)
  );
}

const RECONNECT_DELAY_MS = 3_000;
const POLL_INTERVAL_MS = 20 * 1_000;
const RESUME_SYNC_MIN_INTERVAL_MS = 2_000;

export function getGitHubDataFetchedAt(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("__meta" in value)) {
    return null;
  }

  const meta = value.__meta;
  if (!meta || typeof meta !== "object" || !("fetchedAt" in meta)) {
    return null;
  }

  return typeof meta.fetchedAt === "number" ? meta.fetchedAt : null;
}

export function getGitHubSignalComparisonTimestamp(
  queryState:
    | {
        data?: unknown;
        dataUpdatedAt: number;
      }
    | null
    | undefined
) {
  if (!queryState || queryState.dataUpdatedAt === 0) {
    return null;
  }

  return (
    getGitHubDataFetchedAt(queryState.data) ??
    (queryState.dataUpdatedAt > 0 ? queryState.dataUpdatedAt : null)
  );
}

function tryGitHubQueryScopeFromTargets(
  targets: readonly GitHubSignalStreamTarget[]
): GitHubQueryScope | null {
  for (const target of targets) {
    const key = target.queryKey;
    if (
      Array.isArray(key) &&
      key.length >= 2 &&
      key[0] === "github" &&
      typeof key[1] === "string"
    ) {
      return { userId: key[1] };
    }
  }
  return null;
}

function mergeTargetsWithMyGitHubLists(
  targets: readonly GitHubSignalStreamTarget[]
): GitHubSignalStreamTarget[] {
  const scope = tryGitHubQueryScopeFromTargets(targets);
  if (!scope) {
    return [...targets];
  }

  const extras: GitHubSignalStreamTarget[] = [
    {
      queryKey: githubQueryKeys.pulls.mine(scope),
      signalKeys: [githubRevalidationSignalKeys.pullsMine]
    },
    {
      queryKey: githubQueryKeys.issues.mine(scope),
      signalKeys: [githubRevalidationSignalKeys.issuesMine]
    }
  ];

  const seen = new Set<string>();
  const out: GitHubSignalStreamTarget[] = [];

  for (const target of [...targets, ...extras]) {
    const sig = `${JSON.stringify(target.queryKey)}\0${[...target.signalKeys].toSorted().join(",")}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(target);
  }

  return out;
}

function getSocketIOConfig() {
  const serverUrl = new URL(ENV_WEB_ISOMORPHIC.VITE_SERVER_URL, window.location.origin);
  serverUrl.pathname = "/";
  serverUrl.search = "";
  serverUrl.hash = "";
  return {
    baseUrl: serverUrl.toString().replace(/\/$/, ""),
    path: "/api/ws/github-signals"
  };
}

export function invalidateTargets(
  queryClient: ReturnType<typeof useQueryClient>,
  targets: readonly GitHubSignalStreamTarget[],
  receivedKeys: Set<string>,
  source: string
) {
  let invalidatedCount = 0;

  for (const target of targets) {
    const matchedKeys = target.signalKeys.filter((key) => receivedKeys.has(key));
    if (matchedKeys.length === 0) continue;

    const queryState = queryClient.getQueryState(target.queryKey);
    if (!queryState || queryState.dataUpdatedAt === 0 || queryState.fetchStatus === "fetching") {
      debug(source, "skipping query (no data or already fetching)", {
        queryKey: target.queryKey,
        matchedKeys,
        reason: !queryState ? "no-state" : queryState.dataUpdatedAt === 0 ? "no-data" : "fetching"
      });
      continue;
    }

    debug(source, "invalidating query", {
      queryKey: target.queryKey,
      matchedKeys
    });

    void queryClient.invalidateQueries({
      queryKey: target.queryKey,
      exact: true,
      refetchType: "active"
    });
    invalidatedCount++;
  }

  return invalidatedCount;
}

function signalStreamCompositeKey(queryKey: QueryKey, signalKey: string): string {
  return `${JSON.stringify(queryKey)}\0${signalKey}`;
}

function collectKeysToInvalidateAfterServerSync(
  queryClient: ReturnType<typeof useQueryClient>,
  targets: readonly GitHubSignalStreamTarget[],
  signals: Array<{ signalKey: string; updatedAt: number }>,
  lastSeenTimestamps: Map<string, number>
): string[] {
  const updatedKeys = new Set<string>();

  for (const signal of signals) {
    for (const target of targets) {
      if (!target.signalKeys.includes(signal.signalKey)) {
        continue;
      }

      const compositeKey = signalStreamCompositeKey(target.queryKey, signal.signalKey);
      const lastSeen = lastSeenTimestamps.get(compositeKey);
      const freshnessTimestamp = getGitHubSignalComparisonTimestamp(
        queryClient.getQueryState(target.queryKey)
      );

      if (lastSeen === undefined) {
        if (typeof freshnessTimestamp !== "number") {
          continue;
        }
        if (signal.updatedAt > freshnessTimestamp) {
          updatedKeys.add(signal.signalKey);
        }
        lastSeenTimestamps.set(compositeKey, signal.updatedAt);
      } else if (signal.updatedAt > lastSeen) {
        lastSeenTimestamps.set(compositeKey, signal.updatedAt);
        updatedKeys.add(signal.signalKey);
      }
    }
  }

  return Array.from(updatedKeys);
}

function useGitHubSignalStreamWebSocket(
  targets: readonly GitHubSignalStreamTarget[],
  signalKeysKey: string,
  lastSeenTimestampsRef: RefObject<Map<string, number>>
): GitHubSignalStreamStatus {
  const queryClient = useQueryClient();
  const targetsRef = useRef(targets);
  const [status, setStatus] = useState<GitHubSignalStreamStatus>("connecting");

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    if (signalKeysKey.length === 0) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setStatus("disconnected");
      return;
    }

    const keys = signalKeysKey.split(",");
    let socket: Socket | null = null;
    let disposed = false;
    let lastResumeSyncAt = 0;

    async function syncSignalsFromServer(source: string) {
      try {
        debug(source, "attempting catch-up", {
          signalKeys: keys,
          totalTargets: targetsRef.current.length
        });

        const signals = await orpcClient.github.getRevalidationSignals({
          signalKeys: keys
        });
        if (disposed) return;

        const updatedKeys = collectKeysToInvalidateAfterServerSync(
          queryClient,
          targetsRef.current,
          signals,
          lastSeenTimestampsRef.current
        );

        if (updatedKeys.length === 0) {
          return;
        }

        debug(source, "detected missed or stale cache vs signals", {
          updatedKeys
        });

        const invalidatedCount = invalidateTargets(
          queryClient,
          targetsRef.current,
          new Set(updatedKeys),
          source
        );

        debug(source, "sync processed", {
          updatedKeys,
          invalidatedCount,
          totalTargets: targetsRef.current.length
        });
      } catch (error) {
        debug(source, "sync failed", { error });
      }
    }

    function scheduleResumeSync(source: string) {
      const now = Date.now();
      if (now - lastResumeSyncAt < RESUME_SYNC_MIN_INTERVAL_MS) {
        debug(source, "skipping catch-up attempt", {
          reason: "throttled",
          signalKeys: keys,
          lastResumeSyncAt,
          now
        });
        return;
      }

      lastResumeSyncAt = now;
      debug(source, "scheduling catch-up attempt", {
        signalKeys: keys,
        totalTargets: targetsRef.current.length
      });
      void syncSignalsFromServer(source);
    }

    function sendSubscription() {
      if (socket?.connected) {
        debug("github-signal-stream", "subscribing to signal keys", {
          keys
        });
        socket.emit("subscribe", { keys });
      }
    }

    function handleSignalBroadcast(message: SignalMessage) {
      debug("github-signal-stream", "received signal broadcast", {
        keys: message.keys
      });

      const receivedKeys = new Set(message.keys);
      const currentTargets = targetsRef.current;
      const invalidatedCount = invalidateTargets(
        queryClient,
        currentTargets,
        receivedKeys,
        "github-signal-stream"
      );

      debug("github-signal-stream", "broadcast processed", {
        receivedKeys: message.keys,
        invalidatedCount,
        totalTargets: currentTargets.length
      });
    }

    const { baseUrl, path } = getSocketIOConfig();
    debug("github-signal-stream", "connecting", { baseUrl, path });

    socket = io(baseUrl, {
      path,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS
    });

    const onConnect = () => {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setStatus("connected");
      debug("github-signal-stream", "connected");
      sendSubscription();
      void syncSignalsFromServer("github-signal-ws-catchup");
    };

    const onDisconnect = (reason: string) => {
      debug("github-signal-stream", "disconnected", { reason });
      if (!disposed) {
        // oxlint-disable-next-line react-hooks-js/set-state-in-effect
        setStatus("disconnected");
      }
    };

    const onConnectError = (error: Error) => {
      debug("github-signal-stream", "connection error", { message: error.message });
    };

    const onGithubSignals = (data: unknown) => {
      if (!isSignalMessage(data)) {
        debug("github-signal-stream", "received unknown message type", {
          data
        });
        return;
      }
      handleSignalBroadcast(data);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("github-signals", onGithubSignals);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleResumeSync("github-signal-visibility-catchup");
      }
    }

    function handleWindowFocus() {
      scheduleResumeSync("github-signal-focus-catchup");
    }

    function handleOnline() {
      scheduleResumeSync("github-signal-online-catchup");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleOnline);
      if (socket) {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
        socket.off("github-signals", onGithubSignals);
        socket.disconnect();
        socket = null;
      }
    };
  }, [signalKeysKey, queryClient, lastSeenTimestampsRef]);

  return status;
}

function useGitHubSignalPoll(
  targets: readonly GitHubSignalStreamTarget[],
  signalKeysKey: string,
  lastSeenTimestampsRef: RefObject<Map<string, number>>,
  enabled: boolean
) {
  const queryClient = useQueryClient();
  const targetsRef = useRef(targets);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    if (!enabled || signalKeysKey.length === 0) {
      return;
    }

    const keys = signalKeysKey.split(",");
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function pollSignals() {
      if (disposed) return;

      try {
        const signals = await orpcClient.github.getRevalidationSignals({
          signalKeys: keys
        });

        if (disposed) return;

        const updatedKeys = collectKeysToInvalidateAfterServerSync(
          queryClient,
          targetsRef.current,
          signals,
          lastSeenTimestampsRef.current
        );

        if (updatedKeys.length > 0) {
          debug("github-signal-poll", "detected missed signals", {
            updatedKeys
          });

          const currentTargets = targetsRef.current;
          const invalidatedCount = invalidateTargets(
            queryClient,
            currentTargets,
            new Set(updatedKeys),
            "github-signal-poll"
          );

          debug("github-signal-poll", "poll processed", {
            updatedKeys,
            invalidatedCount,
            totalTargets: currentTargets.length
          });
        } else {
          debug("github-signal-poll", "no missed signals");
        }
      } catch (error) {
        debug("github-signal-poll", "poll failed", { error });
      }

      schedulePoll();
    }

    function schedulePoll() {
      if (disposed) return;
      pollTimer = setTimeout(pollSignals, POLL_INTERVAL_MS);
    }

    void pollSignals();

    return () => {
      disposed = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [enabled, signalKeysKey, queryClient, lastSeenTimestampsRef]);
}

export function useGitHubSignalStream(targets: readonly GitHubSignalStreamTarget[]) {
  const mergedTargets = useMemo(() => mergeTargetsWithMyGitHubLists(targets), [targets]);

  const allSignalKeys = useMemo(
    () => Array.from(new Set(mergedTargets.flatMap((target) => [...target.signalKeys]))).sort(),
    [mergedTargets]
  );

  const signalKeysKey = allSignalKeys.join(",");

  const mergedTargetsIdentity = useMemo(
    () =>
      mergedTargets
        .map((t) => `${JSON.stringify(t.queryKey)}\0${[...t.signalKeys].toSorted().join(",")}`)
        .toSorted()
        .join("|"),
    [mergedTargets]
  );

  const lastSeenTimestampsRef = useRef(new Map<string, number>());

  useEffect(() => {
    void signalKeysKey;
    void mergedTargetsIdentity;
    lastSeenTimestampsRef.current = new Map();
  }, [signalKeysKey, mergedTargetsIdentity]);

  const streamStatus = useGitHubSignalStreamWebSocket(
    mergedTargets,
    signalKeysKey,
    lastSeenTimestampsRef
  );
  useGitHubSignalPoll(
    mergedTargets,
    signalKeysKey,
    lastSeenTimestampsRef,
    streamStatus === "disconnected"
  );
}
