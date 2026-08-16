import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  extractJsonLdJobPostings,
  extractJobListingStructured,
  extractSkillsFromJobDescription
} from "#@/common/extract-job-listing-page";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures/zeal-breezy.html"),
  "utf8"
);

describe("Zeal Breezy listing extract", () => {
  it("reads the full JobPosting body, not the meta teaser", () => {
    const jsonLd = extractJsonLdJobPostings(fixture);
    expect(jsonLd?.title).toBe("Senior Frontend Engineer");
    expect(jsonLd?.companyName).toBe("Zeal");
    expect(jsonLd?.description).toMatch(/About The Role/i);
    expect(jsonLd?.description).toMatch(/React Query/i);
    expect(jsonLd?.description).toMatch(/Work from Anywhere/i);
    expect(jsonLd?.description).not.toMatch(/Think of when you go to $/);
    expect(jsonLd?.workMode).toBe("hybrid");
    expect(jsonLd?.employmentType).toBe("full_time");
    expect(jsonLd?.datePosted).toBe("2024-07-14");
    expect(jsonLd?.experience).toMatch(/4\s*\+\s*years/i);
  });

  it("structured extract keeps the full posting and hybrid mode", () => {
    const extracted = extractJobListingStructured(fixture, "https://zeal.breezy.hr/p/5ef2a1d2ba3a");
    expect(extracted.description).toMatch(/Ideal Candidate/i);
    expect(extracted.description).toMatch(/What You’ll Love About Us/i);
    expect(extracted.workMode).toBe("hybrid");
    expect(extracted.employmentType).toBe("full_time");
    expect(extracted.department).toBe("Engineering");
    expect(extracted.datePosted).toBe("2024-07-14");
    expect(extracted.experience).toMatch(/4\s*\+\s*years/i);
    expect(extracted.skills).toEqual(
      expect.arrayContaining(["React", "Next.js", "TanStack Query", "Tailwind CSS"])
    );
    expect(extracted.skills).not.toEqual(expect.arrayContaining(["React.js", "React Query"]));
  });

  it("pulls stack names from the responsibilities sentence", () => {
    const skills = extractSkillsFromJobDescription(
      "Utilize React.js, Next.js, React Query, Styled Components and Tailwind to build UIs."
    );
    expect(skills.required).toEqual(
      expect.arrayContaining([
        "React",
        "Next.js",
        "TanStack Query",
        "Styled Components",
        "Tailwind CSS"
      ])
    );
  });
});
