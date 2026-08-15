import { describe, expect, it } from "vitest";

import { type JobSourceAdapter } from "@tsu-stack/core";

import { ingestQuery, planIngestQueries } from "#@/lib/job-discovery/ingest";

describe("planIngestQueries", () => {
  it("dedupes two users on the same pack", () => {
    expect(
      planIngestQueries([
        { titleId: "frontend", customTitle: null, roleKeywords: [] },
        { titleId: "frontend", customTitle: null, roleKeywords: ["graphql"] }
      ])
    ).toEqual(["pack:frontend"]);
  });
  it("keeps custom distinct from packs", () => {
    expect(
      planIngestQueries([{ titleId: "custom", customTitle: "SRE", roleKeywords: ["sre", "k8s"] }])
    ).toEqual(["custom:k8s|sre"]);
  });
});

describe("ingestQuery remotive budget", () => {
  it("skips remotive when budget is 0", async () => {
    let remotiveCalls = 0;
    const remotive: JobSourceAdapter = {
      id: "remotive",
      capabilities: ["search"],
      fetch: async () => {
        remotiveCalls += 1;
        return [];
      }
    };
    const result = await ingestQuery({
      queryKey: "pack:frontend",
      remotiveCallsLeft: 0,
      adapters: { remotive }
    });
    expect(remotiveCalls).toBe(0);
    expect(result.remotiveUsed).toBe(0);
  });
});
