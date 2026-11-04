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

import { loadHubProfileContext } from "#@/lib/agent/hub-profile-context";

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
});
