import { describe, expect, it } from "vitest";

import { type ApplicationOutput } from "@tsu-stack/core";

import { getApplicationPrimaryAction } from "@/features/applications/lib/application-primary-action";
import { getApplyPackageEntryState } from "@/features/applications/lib/apply-package";

function app(overrides: Partial<ApplicationOutput> = {}): ApplicationOutput {
  return {
    id: "app-1",
    userId: "user-1",
    title: "Engineer",
    companyName: "Acme",
    description: "Build things with React and TypeScript for customers worldwide.",
    url: "https://example.com/jobs/1",
    applyUrl: null,
    applyMethod: "unknown",
    stage: "saved",
    outcome: null,
    matchScore: null,
    location: null,
    salaryRange: null,
    notes: null,
    source: "manual",
    companyLogoUrl: null,
    experienceYearsMin: null,
    hiringUrgency: "unknown",
    employmentType: null,
    workMode: null,
    hiringRegions: [],
    requiredSkills: [],
    preferredSkills: [],
    listingClosed: false,
    recruiterEmail: null,
    resumeId: null,
    coverLetterBody: null,
    coverLetterR2Key: null,
    coverLetterFilename: null,
    outreachSubject: null,
    outreachBody: null,
    outreachSentAt: null,
    applyPackageDraft: null,
    applyPackageDraftedAt: null,
    fitAnalysis: null,
    agentTake: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides
  } as ApplicationOutput;
}

const draft = {
  applicationId: "app-1",
  generatedAt: "2026-08-23T00:00:00.000Z",
  jobContext: {
    title: "Engineer",
    companyName: "Acme",
    descriptionUsed: "React",
    listingFetched: false
  },
  proposedRecruiterEmail: null,
  professionalSummary: "Summary",
  headline: "",
  experiences: [],
  projects: [],
  stacks: [],
  coverLetterBody: "Cover",
  outreachSubject: "Sub",
  outreachBody: "Body"
};

describe("getApplyPackageEntryState with reviewApplyKit", () => {
  it("returns draft when Review is on and a draft exists", () => {
    expect(
      getApplyPackageEntryState(app({ applyPackageDraft: draft }), { reviewApplyKit: true })
    ).toBe("draft");
  });

  it("never returns draft when Review is off", () => {
    expect(
      getApplyPackageEntryState(app({ applyPackageDraft: draft }), { reviewApplyKit: false })
    ).toBe("accepted");
    expect(
      getApplyPackageEntryState(app({ applyPackageDraft: draft, resumeId: "resume-1" }), {
        reviewApplyKit: false
      })
    ).toBe("accepted");
  });
});

describe("getApplicationPrimaryAction with reviewApplyKit", () => {
  it("shows Review for drafts when Review is on", () => {
    const primary = getApplicationPrimaryAction(app({ applyPackageDraft: draft }), {
      reviewApplyKit: true
    });
    expect(primary).toEqual({ kind: "review", label: "Review" });
  });

  it("shows Prepare again instead of Review when Review is off", () => {
    const primary = getApplicationPrimaryAction(
      app({ applyPackageDraft: draft, resumeId: "resume-1" }),
      { reviewApplyKit: false }
    );
    expect(primary).toEqual({ kind: "prepare-again", label: "Prepare again" });
  });

  it("shows Prepare again for orphan drafts when Review is off", () => {
    const primary = getApplicationPrimaryAction(app({ applyPackageDraft: draft }), {
      reviewApplyKit: false
    });
    expect(primary).toEqual({ kind: "prepare-again", label: "Prepare again" });
  });
});
