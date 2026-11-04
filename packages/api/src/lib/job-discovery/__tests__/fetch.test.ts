import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultJobPreferenceOutput, type JobPreferenceOutput } from "@tsu-stack/core";

const { searchFreehireJobs, upsertMany, logger } = vi.hoisted(() => {
  return {
    searchFreehireJobs: vi.fn(),
    upsertMany: vi.fn(),
    logger: { set: vi.fn(), warn: vi.fn(), error: vi.fn(), emit: vi.fn() }
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    userJobRepository: { upsertMany }
  };
});

vi.mock("@tsu-stack/logger/server", () => {
  return { createLogger: () => logger };
});

vi.mock("#@/lib/job-discovery/freehire/client", () => {
  return { searchFreehireJobs };
});

vi.mock("#@/lib/job-discovery/freehire/query-builder", () => {
  return {
    buildFreehireQuery: vi.fn().mockResolvedValue({
      params: new URLSearchParams({ limit: "100", sort: "created_at", order: "desc" }),
      filters: { seniority: ["senior"] },
      hash: "hash1234",
      dropped: []
    })
  };
});

vi.mock("#@/lib/job-discovery/freehire/map", () => {
  return {
    toUserJobRow: (job: Record<string, unknown>, meta: Record<string, unknown>) => {
      return {
        freehireSlug: job.public_slug,
        ...meta
      };
    }
  };
});

import { fetchUserJobs } from "#@/lib/job-discovery/fetch";

function prefsWith(overrides: Record<string, unknown>): JobPreferenceOutput {
  return { ...defaultJobPreferenceOutput(), ...overrides } as JobPreferenceOutput;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchUserJobs", () => {
  it("fetches with the built query and upserts rows under one queryHash", async () => {
    searchFreehireJobs.mockResolvedValue({
      jobs: [
        { public_slug: "job-a", url: "https://x/a", title: "A" },
        { public_slug: "job-b", url: "https://x/b", title: "B" }
      ],
      total: 77
    });
    upsertMany.mockResolvedValue(2);

    const result = await fetchUserJobs({
      userId: "u1",
      preference: prefsWith({ seniority: ["senior"] })
    });

    expect(searchFreehireJobs).toHaveBeenCalledWith(
      expect.objectContaining({ get: expect.any(Function) })
    );
    expect(upsertMany).toHaveBeenCalledWith(
      "u1",
      expect.arrayContaining([
        expect.objectContaining({
          freehireSlug: "job-a",
          userId: "u1",
          queryHash: "hash1234",
          queryFilters: { seniority: ["senior"] }
        }),
        expect.objectContaining({
          freehireSlug: "job-b",
          queryHash: "hash1234"
        })
      ])
    );
    expect(result).toEqual({ ok: true, total: 77, fetchedCount: 2, hash: "hash1234" });
    expect(logger.emit).toHaveBeenCalledTimes(1);
  });

  it("upserts nothing when the search returns zero jobs", async () => {
    searchFreehireJobs.mockResolvedValue({ jobs: [], total: 0 });
    const result = await fetchUserJobs({ userId: "u1", preference: prefsWith({}) });
    expect(result).toEqual({ ok: true, total: 0, fetchedCount: 0, hash: "hash1234" });
    expect(upsertMany).toHaveBeenCalledWith("u1", []);
  });

  it("propagates fetch failures so the queue can retry instead of completing successfully", async () => {
    searchFreehireJobs.mockRejectedValue(new Error("HTTP 503 paused"));
    await expect(fetchUserJobs({ userId: "u1", preference: prefsWith({}) })).rejects.toThrow(
      "HTTP 503 paused"
    );
    expect(upsertMany).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(logger.emit).toHaveBeenCalledWith({ _forceKeep: true });
  });

  it("propagates storage failures for retry", async () => {
    searchFreehireJobs.mockResolvedValue({ jobs: [{ public_slug: "a" }], total: 1 });
    upsertMany.mockRejectedValue(new Error("deadlock"));
    await expect(fetchUserJobs({ userId: "u1", preference: prefsWith({}) })).rejects.toThrow(
      "deadlock"
    );
  });
});
