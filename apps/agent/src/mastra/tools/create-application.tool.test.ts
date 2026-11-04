import { RequestContext } from "@mastra/core/di";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createIfAbsentByUrl, append, setTrackingStatus, update } = vi.hoisted(() => {
  return {
    createIfAbsentByUrl: vi.fn(),
    append: vi.fn(),
    setTrackingStatus: vi.fn(),
    update: vi.fn()
  };
});
vi.mock("@tsu-stack/db", () => {
  return {
    createDb: () => {
      return {};
    },
    runWithDb: (_db: unknown, fn: () => unknown) => fn(),
    applicationRepository: { createIfAbsentByUrl, setTrackingStatus, update },
    applicationActivityRepository: { append }
  };
});
vi.mock("#@/mastra/lib/link-job-skills", () => {
  return {
    linkJobSkillsForUserInAgent: async () => {
      return { requiredSkills: [], preferredSkills: [] };
    }
  };
});

import { createApplicationTool } from "./create-application.tool";

describe("createApplicationTool URL saves", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([true, false])(
    "saves a URL without reading an uninitialized result, created=%s",
    async (created) => {
      createIfAbsentByUrl.mockResolvedValue({
        row: { id: "app-1", trackingStatus: "tracked" },
        created
      });
      const result = await createApplicationTool.execute!(
        {
          title: "Frontend Engineer",
          companyName: "Acme",
          description: "React frontend role",
          url: "https://example.com/job"
        },
        { requestContext: new RequestContext([["userId", "session-user"]]) } as never
      );
      expect(result).toEqual({ ok: true, applicationId: "app-1", created });
      expect(createIfAbsentByUrl).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "session-user" })
      );
      expect(append).toHaveBeenCalledTimes(created ? 1 : 0);
    }
  );

  it("promotes an existing inbox application after confirmation", async () => {
    const row = { id: "app-1", trackingStatus: "inbox" };
    createIfAbsentByUrl.mockResolvedValue({ row, created: false });
    setTrackingStatus.mockResolvedValue({ ...row, trackingStatus: "tracked" });
    update.mockResolvedValue({ ...row, trackingStatus: "tracked" });
    const result = await createApplicationTool.execute!(
      {
        title: "Frontend Engineer",
        companyName: "Acme",
        description: "React frontend role",
        url: "https://example.com/job"
      },
      { requestContext: new RequestContext([["userId", "session-user"]]) } as never
    );
    expect(result).toEqual({ ok: true, applicationId: "app-1", created: false });
    expect(setTrackingStatus).toHaveBeenCalledWith("app-1", "session-user", "tracked");
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "promoted", userId: "session-user" })
    );
  });
});
