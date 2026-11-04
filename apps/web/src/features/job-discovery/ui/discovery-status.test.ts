import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type DiscoveryRun } from "@tsu-stack/core";

const { query } = vi.hoisted(() => {
  return { query: vi.fn() };
});
vi.mock("@/features/job-discovery/api/discovery-status.query", () => {
  return {
    useDiscoveryStatusQuery: query
  };
});

import { DiscoveryStatus } from "./discovery-status";

const run: DiscoveryRun = {
  runId: "fixture",
  stage: "retrying",
  reason: "Job source returned HTTP 503.",
  fetched: 0,
  evaluated: 0,
  added: 0,
  rejected: 0,
  pending: 0,
  warnings: [],
  scheduledAt: "2026-11-04T10:00:00.000Z",
  updatedAt: "2026-11-04T10:01:00.000Z",
  retryAt: "2026-11-04T10:02:00.000Z"
};
function render(value: DiscoveryRun) {
  query.mockReturnValue({
    isError: false,
    data: { run: value, lastSuccessfulAt: null, nextScheduledAt: null }
  });
  return renderToStaticMarkup(createElement(DiscoveryStatus));
}
afterEach(() => vi.clearAllMocks());

describe("DiscoveryStatus", () => {
  it("shows the actual source failure and retry time without claiming no matches", () => {
    const html = render(run);
    expect(html).toContain("Retrying");
    expect(html).toContain("HTTP 503");
    expect(html).toContain("Next attempt:");
    expect(html).not.toContain("already on a tracked job");
  });
  it("distinguishes a terminal failure from a completed empty search", () => {
    expect(render({ ...run, stage: "failed", retryAt: null })).toContain("Search failed");
    expect(
      render({
        ...run,
        stage: "completed",
        reason: "No unseen listings passed your saved preferences.",
        retryAt: null
      })
    ).toContain("Search completed with no new matches");
  });
  it("renders persisted additions and explicit local salary handling", () => {
    const html = render({
      ...run,
      stage: "completed",
      added: 3,
      reason: null,
      retryAt: null,
      warnings: ["Unknown pay and other currencies remain eligible."]
    });
    expect(html).toContain("3 new jobs added");
    expect(html).toContain("Unknown pay and other currencies remain eligible.");
    expect(html).toContain('aria-live="polite"');
  });
  it("reports unavailable status separately from successful empty results", () => {
    query.mockReturnValue({ isError: true });
    expect(renderToStaticMarkup(createElement(DiscoveryStatus))).toContain(
      "Search status unavailable"
    );
  });
});

it("shows readable blocked reasons without a stale retry time", () => {
  const html = render({ ...run, stage: "failed", reason: "title_required" });
  expect(html).toContain("Search paused");
  expect(html).toContain("Choose a role or category");
  expect(html).not.toContain("title_required");
  expect(html).not.toContain("Next attempt:");
});
it("displays both successful and scheduled timestamps", () => {
  const last = "2026-11-03T12:00:00.000Z";
  const next = "2026-11-05T12:00:00.000Z";
  query.mockReturnValue({
    isError: false,
    data: { run: null, lastSuccessfulAt: last, nextScheduledAt: next }
  });
  const html = renderToStaticMarkup(createElement(DiscoveryStatus));
  expect(html).toContain(`Last successful search: ${new Date(last).toLocaleString()}`);
  expect(html).toContain(`Next automatic search: ${new Date(next).toLocaleString()}`);
});
