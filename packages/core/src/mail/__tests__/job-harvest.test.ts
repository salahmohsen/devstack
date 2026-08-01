import { describe, expect, it } from "vitest";

import {
  canonicalizeJobUrl,
  harvestJobsFromMailBody,
  isValidHarvestedJob,
  scoreJobAgainstPreference
} from "#@/mail/job-harvest";

const LINKEDIN_DIGEST = {
  fromEmail: "jobalerts-noreply@linkedin.com",
  subject: "Frontend Lead – React Native at QNBeyond Plus",
  bodyText: `Your job alert for frontend developer in Cairo            
Frontend Lead – React Native
QNBeyond Plus
Cairo, Egypt
Apply with resume & profile
View job: https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=P%2Bl1q52p1yrPF7miFi2weg%3D%3D&refId=eq25cGj%2Fajoe2CPo%2F7gDbg%3D%3D

---------------------------------------------------------
  
            
Senior Frontend Developer (Angular)
Confidential
Egypt

This company is actively hiring
Apply with resume & profile
View job: https://www.linkedin.com/comm/jobs/view/4444144767/?trackingId=oVUYe%2FlUi4XPJJCI6HnJQw%3D%3D

---------------------------------------------------------
  
            
 Software Engineer - ElectronJS, Desktop (Remote)
Quik Hire Staffing
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4446722402/?trackingId=IC4zwTPb5JPNRozkMYR8%2Bg%3D%3D
`,
  bodyHtml: null as string | null
};

const HIRING_SUGGESTIONS = {
  fromEmail: "jobs-noreply@linkedin.com",
  subject: "Storyteller is hiring for a Remote role",
  bodyText: `Expand your search

Recommendations based on your activity.
  

            
Remote jobs
https://www.linkedin.com/comm/jobs/search-results/?keywords=junior+software+engineer+remote

      
Junior Web Developer
Storyteller
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4446392638/?trackingId=VhlhGeNmEP8b8b3bxqibPQ%3D%3D

---------------------------------------------------------
  
      
Front-End Software Developer
exequt
Cairo
View job: https://www.linkedin.com/comm/jobs/view/4444247981/?trackingId=a084zTyh1YYsrzjl99Dwjw%3D%3D
`,
  bodyHtml: null as string | null
};

const APPLY_NOW = {
  fromEmail: "jobs-noreply@linkedin.com",
  subject: "Salah, apply now to 'Junior Software Engineer — Remote, Egypt'",
  bodyText: `Your saved job at MixRank is still available.

      
Junior Software Engineer — Remote, Egypt
MixRank
Egypt
View job: https://www.linkedin.com/comm/jobs/view/4415454308?trackingId=&refId=

---------------------------------------------------------
  
      
Apply now

      https://www.linkedin.com/comm/jobs/view/4415454308?lipi=foo
      


    


Your other saved jobs        
Senior Frontend Engineer
Yassir
Cairo, Cairo, Egypt
View job: https://www.linkedin.com/comm/jobs/view/4440801290?trackingId=&refId=
`,
  bodyHtml: null as string | null
};

describe("canonicalizeJobUrl", () => {
  it("strips LinkedIn tracking to stable job id", () => {
    const raw =
      "https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=abc&refId=xyz&lipi=foo";
    expect(canonicalizeJobUrl(raw)).toBe("https://www.linkedin.com/jobs/view/4443683970");
  });
});

describe("harvestJobsFromMailBody — multi-line LinkedIn cards", () => {
  it("parses title, company, location, easy_apply from classic digest", () => {
    const jobs = harvestJobsFromMailBody(LINKEDIN_DIGEST);
    expect(jobs.length).toBeGreaterThanOrEqual(3);

    const first = jobs.find((j) => j.listingUrl.includes("4443683970"));
    expect(first).toBeDefined();
    expect(first!.title).toBe("Frontend Lead – React Native");
    expect(first!.companyName).toBe("QNBeyond Plus");
    expect(first!.location).toMatch(/Cairo|Egypt/i);
    expect(first!.applyMethod).toBe("easy_apply");
    expect(first!.source).toBe("linkedin");
    expect(isValidHarvestedJob(first!)).toBe(true);

    const angular = jobs.find((j) => j.listingUrl.includes("4444144767"));
    expect(angular?.title).toContain("Senior Frontend Developer");
    expect(angular?.companyName).toBe("Confidential");
  });

  it("parses facet suggestions without using subject as title", () => {
    const jobs = harvestJobsFromMailBody(HIRING_SUGGESTIONS);
    expect(jobs.every((j) => !/is hiring for a/i.test(j.title))).toBe(true);
    const story = jobs.find((j) => j.listingUrl.includes("4446392638"));
    expect(story?.title).toBe("Junior Web Developer");
    expect(story?.companyName).toBe("Storyteller");
    expect(story?.location).toBe("Egypt");
  });

  it("parses saved-job reminder cards", () => {
    const jobs = harvestJobsFromMailBody(APPLY_NOW);
    const mix = jobs.find((j) => j.listingUrl.includes("4415454308"));
    expect(mix?.title).toMatch(/Junior Software Engineer/i);
    expect(mix?.companyName).toBe("MixRank");
    expect(mix?.location).toBe("Egypt");
    // same job id only once
    expect(jobs.filter((j) => j.listingUrl.includes("4415454308")).length).toBe(1);
    const yassir = jobs.find((j) => j.listingUrl.includes("4440801290"));
    expect(yassir?.title).toBe("Senior Frontend Engineer");
    expect(yassir?.companyName).toBe("Yassir");
  });
});

describe("scoreJobAgainstPreference", () => {
  const prefs = {
    workModes: ["remote"] as const,
    locations: [] as string[],
    roleKeywords: ["frontend", "react", "engineer", "developer", "software"],
    excludeKeywords: [] as string[],
    salaryMin: null,
    salaryCurrency: null,
    minMatchScore: 40
  };

  it("scores frontend title highly", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Senior Frontend Engineer",
        companyName: "Acme",
        location: "Remote",
        listingUrl: "https://www.linkedin.com/jobs/view/1",
        applyMethod: "easy_apply",
        workMode: "remote",
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects non-matching titles when keywords set", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Graphic Designer",
        companyName: "Studio",
        location: "Cairo",
        listingUrl: "https://www.linkedin.com/jobs/view/2",
        applyMethod: "unknown",
        workMode: null,
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(false);
  });

  it("rejects garbage titles", () => {
    const r = scoreJobAgainstPreference(
      {
        title: "Storyteller is hiring for a Remote role",
        companyName: "Unknown company",
        listingUrl: "https://www.linkedin.com/jobs/view/3",
        applyMethod: "unknown",
        source: "linkedin"
      },
      { ...prefs, workModes: ["remote"] }
    );
    expect(r.passed).toBe(false);
  });
});
