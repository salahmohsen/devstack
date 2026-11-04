import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type DiscoveryRun } from "@tsu-stack/core";

const mocks = vi.hoisted(() => {
  return {
    findNow: vi.fn(),
    status: vi.fn(),
    toast: vi.fn(),
    complete: vi.fn(),
    invalidateInbox: vi.fn()
  };
});
vi.mock("@tsu-stack/auth/react/tanstack-start/queries", () => {
  return {
    getAuthUserQueryOptions: () => {
      return { queryKey: ["user"] };
    }
  };
});
vi.mock("@tsu-stack/api/client/tanstack-start/orpc", () => {
  return {
    orpcClient: { jobDiscovery: { findNow: mocks.findNow, status: mocks.status } },
    orpcQueryClient: {
      applications: { count: { queryKey: () => ["inbox-count"] } },
      aiSettings: { get: { key: () => ["ai-settings"] } },
      jobDiscovery: { status: { key: () => ["discovery-status"] } }
    }
  };
});
vi.mock("sonner", () => {
  return {
    toast: { message: mocks.toast, error: mocks.toast, info: mocks.toast }
  };
});
vi.mock("@/shared/lib/invalidate-applications-list", () => {
  return {
    invalidateApplicationsListQueries: mocks.invalidateInbox
  };
});
vi.mock("@/shared/lib/ai-job", async () => {
  return {
    ...(await import("@/shared/lib/ai-job/create-detached-job")),
    ...(await import("@/shared/lib/ai-job/create-external-store")),
    isAbortError: (error: unknown) => error instanceof DOMException && error.name === "AbortError",
    appendIslandStep: vi.fn(),
    completeAiJobIsland: mocks.complete,
    dismissAiJobIsland: vi.fn(),
    upsertAiJobIsland: vi.fn()
  };
});

import {
  bindDiscoveryAccount,
  dismissFindJobsNowTracking,
  startFindJobsNow
} from "@/shared/lib/find-jobs-now-job";
import { getFindJobsNowState, resetFindJobsNowState } from "@/shared/lib/find-jobs-now-store";

const run: DiscoveryRun = {
  runId: "run-a",
  stage: "completed",
  reason: null,
  fetched: 1,
  evaluated: 1,
  added: 1,
  rejected: 0,
  pending: 0,
  warnings: [],
  scheduledAt: "2026-11-04T10:00:00.000Z",
  updatedAt: "2026-11-04T10:01:00.000Z",
  retryAt: null
};
let client: QueryClient;
let unbind: () => void;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.clearAllMocks();
  resetFindJobsNowState();
  client = new QueryClient();
  client.setQueryData(["user"], { id: "account-a" });
  unbind = bindDiscoveryAccount(client);
  mocks.findNow.mockResolvedValue({
    enqueued: true,
    ingestTriggered: false,
    seats: 1,
    reason: "ok",
    runId: "run-a"
  });
  mocks.status.mockReset().mockResolvedValue({ run });
  mocks.invalidateInbox.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  dismissFindJobsNowTracking();
  unbind();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("discovery tracking lifecycle", () => {
  it("retries a transient status read and still reports the actual completion", async () => {
    mocks.status.mockRejectedValueOnce(Object.assign(new Error("temporary"), { status: 503 }));
    const pending = startFindJobsNow(client);
    await vi.advanceTimersByTimeAsync(1_000);
    await pending;
    expect(mocks.status).toHaveBeenCalledTimes(2);
    expect(getFindJobsNowState()).toMatchObject({ status: "ready", newJobsFound: 1, error: null });
  });
  it("ends bounded tracking failures without reporting that the server search failed", async () => {
    mocks.status.mockRejectedValue(new TypeError("network unavailable"));
    const pending = startFindJobsNow(client);
    await vi.advanceTimersByTimeAsync(7_000);
    await pending;
    expect(mocks.status).toHaveBeenCalledTimes(4);
    expect(getFindJobsNowState()).toMatchObject({
      status: "ready",
      error: expect.stringContaining("may still be running")
    });
    expect(mocks.complete).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ resultTitle: "Search status unavailable" })
    );
  });
  it("ends a status read that never settles at its request deadline", async () => {
    mocks.status.mockReturnValue(new Promise(() => undefined));
    const pending = startFindJobsNow(client);
    await vi.advanceTimersByTimeAsync(15_000);
    await pending;
    expect(mocks.status).toHaveBeenCalledTimes(1);
    expect(getFindJobsNowState()).toMatchObject({
      status: "ready",
      error: expect.stringContaining("Live status could not be read")
    });
  });
  it("preserves the still-running message after the overall tracking limit", async () => {
    mocks.status.mockResolvedValue({ run: { ...run, stage: "scoring", added: 0 } });
    const pending = startFindJobsNow(client);
    await vi.advanceTimersByTimeAsync(20 * 60_000 + 3_000);
    await pending;
    expect(getFindJobsNowState().error).toContain("Search is still running");
    expect(mocks.complete).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ resultTitle: "Search is still running" })
    );
  });
  it("does not retry an invalid session", async () => {
    mocks.status.mockRejectedValue(Object.assign(new Error("signed out"), { status: 401 }));
    await startFindJobsNow(client);
    expect(mocks.status).toHaveBeenCalledTimes(1);
  });
  it.each(["inbox", "terminal"])(
    "cannot overwrite a replacement run after awaiting %s invalidation",
    async (boundary) => {
      const gate = deferred();
      if (boundary === "inbox") mocks.invalidateInbox.mockReturnValueOnce(gate.promise);
      else {
        vi.spyOn(client, "invalidateQueries")
          .mockResolvedValueOnce()
          .mockReturnValueOnce(gate.promise);
      }
      const old = startFindJobsNow(client);
      await vi.advanceTimersByTimeAsync(0);
      dismissFindJobsNowTracking();
      mocks.status.mockResolvedValue({ run: { ...run, stage: "scoring", added: 0 } });
      const replacement = startFindJobsNow(client);
      await vi.advanceTimersByTimeAsync(0);
      gate.resolve();
      await old;
      expect(getFindJobsNowState()).toMatchObject({ status: "running", newJobsFound: 0 });
      expect(mocks.complete).not.toHaveBeenCalled();
      dismissFindJobsNowTracking();
      await replacement;
    }
  );
  it("clears the tracker and discovery cache when the authenticated account changes", async () => {
    const gate = deferred();
    mocks.invalidateInbox.mockReturnValueOnce(gate.promise);
    const pending = startFindJobsNow(client);
    await vi.advanceTimersByTimeAsync(0);
    client.setQueryData(["discovery-status", { userId: "account-a" }], { run });
    client.setQueryData(["user"], null);
    client.setQueryData(["user"], { id: "account-b" });
    gate.resolve();
    await pending;
    expect(getFindJobsNowState()).toMatchObject({ status: "idle", newJobsFound: 0 });
    expect(client.getQueriesData({ queryKey: ["discovery-status"] })).toEqual([]);
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
