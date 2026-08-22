import { describe, expect, it } from "vitest";

import { HubGetApplicationOutputSchema } from "#@/application/hub-get-application";

const validApplication = {
  id: "app-1",
  companyName: "Acme",
  title: "Engineer",
  url: "https://example.com/jobs/1",
  applyUrl: null,
  location: "Remote",
  workMode: "remote" as const,
  salaryRange: null,
  employmentType: "full_time" as const,
  experienceYearsMin: 3,
  trackingStatus: "tracked" as const,
  stage: "applied" as const,
  outcome: null,
  hiringUrgency: "unknown" as const,
  matchScore: 80,
  requiredSkills: [{ name: "React", band: "required" as const }],
  preferredSkills: [],
  description: "Full job description — every section.",
  agentTake: "- Strong React overlap",
  kit: {
    resumeId: "res-1",
    resumeFilename: "cv.pdf",
    coverLetterBody: "Hello",
    outreachSubject: "Hi",
    outreachBody: "Body",
    draftExists: true,
    recruiterEmail: "recruiter@acme.com",
    outreachSentAt: "2026-08-01T00:00:00.000Z"
  },
  activity: [
    {
      id: "act-1",
      kind: "note" as const,
      body: "Recruiter said Friday",
      createdAt: "2026-08-01T00:00:00.000Z"
    }
  ],
  linkedMails: [
    {
      id: "mail-1",
      subject: "Thanks",
      fromName: "Pat",
      fromEmail: "pat@acme.com",
      receivedAt: "2026-08-01T00:00:00.000Z",
      labels: ["application"]
    }
  ]
};

const validOutput = {
  found: true,
  application: validApplication
};

describe("HubGetApplicationOutputSchema", () => {
  it("accepts a valid hub payload", () => {
    expect(HubGetApplicationOutputSchema.parse(validOutput)).toEqual(validOutput);
  });

  it("accepts found=false with a null application", () => {
    expect(HubGetApplicationOutputSchema.parse({ found: false, application: null })).toEqual({
      found: false,
      application: null
    });
  });

  it.each(["coverLetterR2Key", "r2Key", "applyPackageDraft", "fitAnalysis", "notes"] as const)(
    "rejects forbidden key %s on the application object",
    (key) => {
      const result = HubGetApplicationOutputSchema.safeParse({
        found: true,
        application: { ...validApplication, [key]: "forbidden" }
      });
      expect(result.success).toBe(false);
    }
  );

  it("rejects r2Key on kit", () => {
    const result = HubGetApplicationOutputSchema.safeParse({
      found: true,
      application: {
        ...validApplication,
        kit: { ...validApplication.kit, r2Key: "resumes/cv.pdf" }
      }
    });
    expect(result.success).toBe(false);
  });
});
