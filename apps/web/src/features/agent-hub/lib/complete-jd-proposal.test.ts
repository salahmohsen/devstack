import { describe, expect, it } from "vitest";

import { CreateApplicationInputSchema } from "@tsu-stack/core";

import {
  createInputFromJdProposal,
  inferJdCardActionFromCrm,
  mergeJdProposalWithListingPreview,
  sanitizeOptionalHttpUrl,
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
  it.each([null, undefined])(
    "keeps an unverified proposal score %s when preview has a heuristic",
    (matchScore) => {
      const merged = mergeJdProposalWithListingPreview(
        { ...input, matchScore },
        {
          ok: true,
          title: "Engineer",
          companyName: "Acme",
          location: null,
          description: "Build React apps",
          workMode: null,
          salaryRange: null,
          employmentType: null,
          department: null,
          datePosted: null,
          experience: null,
          requiredSkills: [],
          preferredSkills: [],
          matchScore: 40
        }
      );
      expect(merged.matchScore).toBeNull();
      expect(createInputFromJdProposal(merged).matchScore).toBeNull();
    }
  );
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

  it("overrides a hallucinated title/company when previewListing extract looks real", () => {
    const longDeelJd = [
      "Who We Are Is What We Do. Deel is the all-in-one payroll and HR platform for global teams.",
      "Summary The Senior Full Stack Engineer is responsible for designing, developing, and",
      "maintaining both the front-end and back-end components of Deel's platform. You will develop",
      "high-quality, responsive web applications using TypeScript, Javascript, React, Express.",
      "Qualifications At least 8 years of Full-Stack experience, with a focus on TypeScript."
    ].join(" ");
    const merged = mergeJdProposalWithListingPreview(
      {
        ...input,
        title: "Junior AI / Agentic Engineer (Full-Stack + Automation)",
        companyName: "HexaFlow",
        location: "Egypt",
        description: "Build AI agents for HexaFlow clients with Next.js and n8n.",
        matchScore: 90,
        notes: "Junior-friendly remote role for an agent-first engineer.",
        url: "https://www.linkedin.com/jobs/view/4456503372/"
      },
      {
        ok: true,
        title: "Senior Full Stack Engineer - EMEA",
        companyName: "Deel",
        location: "Egypt",
        description: longDeelJd,
        workMode: "remote",
        salaryRange: null,
        employmentType: "full_time",
        department: "Engineering and Information Technology",
        datePosted: null,
        experience: "At least 8 years",
        requiredSkills: ["TypeScript", "React", "Express"],
        preferredSkills: ["NestJS"],
        matchScore: 15
      }
    );
    expect(merged.title).toBe("Senior Full Stack Engineer - EMEA");
    expect(merged.companyName).toBe("Deel");
    expect(merged.description).toMatch(/Deel is the all-in-one payroll/);
    expect(merged.matchScore).toBe(15);
    expect(merged.experience).toMatch(/8 years/i);
  });

  it("returns null when no dismissed listing matches", () => {
    expect(
      inferJdCardActionFromCrm(input, {
        dismissed: [{ url: "https://www.linkedin.com/jobs/view/999" }]
      })
    ).toBeNull();
  });
});

describe("createInputFromJdProposal", () => {
  it("drops LLM sentinel applyUrl/url so create validation passes", () => {
    const created = createInputFromJdProposal({
      ...input,
      applyUrl: "None",
      url: "https://www.linkedin.com/jobs/view/4458164349/",
      matchScore: 72.4
    });
    expect(created.applyUrl).toBeNull();
    expect(created.url).toBe("https://www.linkedin.com/jobs/view/4458164349");
    expect(created.matchScore).toBe(72);
    expect(CreateApplicationInputSchema.safeParse(created).success).toBe(true);
  });

  it("sanitizeOptionalHttpUrl rejects None / bare hosts", () => {
    expect(sanitizeOptionalHttpUrl("None")).toBeNull();
    expect(sanitizeOptionalHttpUrl("n/a")).toBeNull();
    expect(sanitizeOptionalHttpUrl("linkedin.com/jobs/view/1")).toBeNull();
    expect(sanitizeOptionalHttpUrl("https://www.linkedin.com/jobs/view/1/")).toBe(
      "https://www.linkedin.com/jobs/view/1"
    );
  });

  it("merge drops sentinel applyUrl instead of keeping None", () => {
    const merged = mergeJdProposalWithListingPreview({ ...input, applyUrl: "None" }, null);
    expect(merged.applyUrl).toBeNull();
  });
});
