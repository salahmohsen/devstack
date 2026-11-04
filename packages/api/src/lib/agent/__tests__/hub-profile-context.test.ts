import { beforeEach, describe, expect, it, vi } from "vitest";

const { experiences, projects, stacks, preferences } = vi.hoisted(() => {
  return {
    experiences: vi.fn(),
    projects: vi.fn(),
    stacks: vi.fn(),
    preferences: vi.fn()
  };
});
vi.mock("@tsu-stack/db", () => {
  return {
    experienceRepository: { findAllByUserId: experiences },
    projectRepository: { findAllByUserId: projects },
    stackRepository: { findAllByUserId: stacks }
  };
});
vi.mock("#@/lib/application/load-job-preference", () => {
  return { loadJobPreference: preferences };
});

import {
  loadHubProfileContext,
  loadOptionalHubProfileContext
} from "#@/lib/agent/hub-profile-context";

describe("loadHubProfileContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    experiences.mockResolvedValue([]);
    projects.mockResolvedValue([]);
    stacks.mockResolvedValue([]);
    preferences.mockResolvedValue({ workModes: ["remote"] });
  });

  it("loads only the session user's evidence and keeps dates and grounded skills", async () => {
    experiences.mockResolvedValue([
      {
        title: "Frontend Engineer",
        organization: "Acme",
        fromDate: "2020-01-01",
        toDate: "2024-01-01",
        isPresent: false,
        description: "Built React apps"
      }
    ]);
    projects.mockResolvedValue([
      {
        title: "Portfolio",
        summary: "Accessible web app",
        analysis: "private analysis",
        stacks: [{ stack: { name: "React" } }]
      }
    ]);
    stacks.mockResolvedValue([{ name: "React", icon: "large-svg" }]);
    const profile = JSON.parse(await loadHubProfileContext("session-user"));
    for (const read of [experiences, projects, stacks, preferences]) {
      expect(read).toHaveBeenCalledExactlyOnceWith("session-user");
    }
    expect(profile.experienceYears).toBe(4);
    expect(profile.experiences[0].fromDate).toBe("2020-01-01");
    expect(profile.skills).toEqual(["React"]);
    expect(profile.projects[0]).not.toHaveProperty("analysis");
    expect(JSON.stringify(profile)).not.toContain("large-svg");
  });

  it("represents an empty profile without inventing experience", async () => {
    const profile = JSON.parse(await loadHubProfileContext("empty-user"));
    expect(profile.experienceYears).toBeNull();
    expect(profile.totals).toEqual({ experiences: 0, projects: 0, skills: 0 });
  });

  it("includes relevant career evidence beyond the first 20 experiences", async () => {
    experiences.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => {
        return {
          title: i === 20 ? "Frontend Team Lead" : `Engineer ${i}`,
          organization: "Acme",
          description: "Led frontend delivery",
          fromDate: "2019-01-01",
          toDate: "2024-01-01",
          isPresent: false
        };
      })
    );
    const profile = JSON.parse(await loadHubProfileContext("session-user"));
    expect(profile.experiences).toHaveLength(21);
    expect(profile.experiences[20].title).toBe("Frontend Team Lead");
    expect(profile.totals.experiences).toBe(21);
  });

  it.each(["experiences", "projects", "stacks", "preferences"] as const)(
    "allows chat to continue when %s cannot load",
    async (name) => {
      ({ experiences, projects, stacks, preferences })[name].mockRejectedValueOnce(
        new Error("read unavailable")
      );
      await expect(loadOptionalHubProfileContext("session-user")).resolves.toBeUndefined();
    }
  );
});
