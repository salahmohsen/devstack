import { describe, expect, it } from "vitest";

import {
  inferJdCardActionFromCrm,
  mergeJdProposalWithListingPreview,
  shouldGenerateJdProposalTake
} from "./complete-jd-proposal";

const input = {
  title: "Engineer",
  companyName: "Intella",
  description: "Build things",
  url: "https://www.linkedin.com/jobs/view/4312283054",
  applyUrl: null,
  location: null,
  matchScore: 81,
  notes: null,
  applyMethod: null,
  workMode: null,
  source: "linkedin" as const,
  salaryRange: null
};

describe("inferJdCardActionFromCrm", () => {
  it("recovers dismiss from a matching dismissed listing", () => {
    expect(
      inferJdCardActionFromCrm(input, {
        dismissed: [{ url: "https://www.linkedin.com/jobs/view/4312283054" }]
      })
    ).toBe("dismiss");
  });

  it("replaces a teaser description and fills missing skills and work mode", () => {
    const merged = mergeJdProposalWithListingPreview(
      { ...input, description: "About Zeal: short teaser." },
      {
        ok: true,
        title: "Senior Frontend Engineer",
        companyName: "Zeal",
        location: "New Cairo, EG",
        description:
          "About The Role: Utilize React.js, Next.js, React Query and Tailwind. Work from Anywhere: remote or hybrid.",
        workMode: "hybrid",
        salaryRange: null,
        employmentType: "full_time",
        department: "Engineering",
        datePosted: "2024-07-14",
        experience: "4+ years of experience",
        requiredSkills: ["React.js", "Next.js", "React Query", "Tailwind"],
        preferredSkills: []
      }
    );
    expect(merged.description).toMatch(/About The Role/);
    expect(merged.workMode).toBe("hybrid");
    expect(merged.employmentType).toBe("full_time");
    expect(merged.department).toBe("Engineering");
    expect(merged.datePosted).toBe("2024-07-14");
    expect(merged.experience).toMatch(/4\s*\+\s*years/i);
    expect(merged.requiredSkills).toEqual(
      expect.arrayContaining(["React", "Next.js", "TanStack Query"])
    );
  });

  it("replaces LinkedIn listing + 0% match with the preview extract", () => {
    const merged = mergeJdProposalWithListingPreview(
      {
        ...input,
        companyName: "Company unavailable (LinkedIn listing)",
        matchScore: 0,
        notes: "The listing could not be evaluated because LinkedIn requires login.",
        requiredSkills: ["React.js"],
        preferredSkills: ["Redis"],
        description: "Short teaser from the login chrome."
      },
      {
        ok: true,
        title: "Senior Frontend Engineer",
        companyName: "Yassir",
        location: "Cairo, Cairo, Egypt",
        description:
          "About Your Role As Frontend Developer. Design and build web applications using React.js. Must have technical skills with at least 5 years of experience. Language: Javascript. Framework: React.JS, Express.JS. Familiarity with REST APIs and micro-services. Nice to have technical skills including Docker, Kubernetes, and Redis server. Don't just apply for a job, come and be a part of our journey building products used across 45 cities.",
        workMode: null,
        salaryRange: null,
        employmentType: "full_time",
        department: "Engineering and Information Technology",
        datePosted: null,
        experience: "at least 5 years of experience",
        requiredSkills: ["React", "JavaScript"],
        preferredSkills: ["Redis"],
        matchScore: 78
      }
    );
    expect(merged.companyName).toBe("Yassir");
    expect(merged.employmentType).toBe("full_time");
    expect(merged.matchScore).toBe(78);
    expect(merged.notes).toBeNull();
    expect(merged.requiredSkills).toEqual(expect.arrayContaining(["React", "JavaScript"]));
    expect(merged.description).toMatch(/Don't just apply/);
    expect(shouldGenerateJdProposalTake(merged)).toBe(true);
    expect(
      shouldGenerateJdProposalTake({
        ...merged,
        notes: "Strong React fit in Cairo; verify hybrid vs on-site."
      })
    ).toBe(false);
  });

  it("prefers a heuristic 0 over an LLM score of 82", () => {
    const merged = mergeJdProposalWithListingPreview(
      { ...input, matchScore: 82 },
      {
        ok: true,
        title: "Senior React Native Engineer",
        companyName: "Acme",
        location: "Remote",
        description: "Build React Native apps.",
        workMode: "remote",
        salaryRange: null,
        employmentType: null,
        department: null,
        datePosted: null,
        experience: null,
        requiredSkills: [],
        preferredSkills: [],
        matchScore: 0
      }
    );
    expect(merged.matchScore).toBe(0);
  });

  it("returns null when no dismissed listing matches", () => {
    expect(
      inferJdCardActionFromCrm(input, {
        dismissed: [{ url: "https://www.linkedin.com/jobs/view/999" }]
      })
    ).toBeNull();
  });
});
