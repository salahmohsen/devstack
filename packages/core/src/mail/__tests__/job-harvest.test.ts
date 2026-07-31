import { describe, expect, it } from "vitest";

import {
  canonicalizeJobUrl,
  extractJobListingUrls,
  harvestJobsFromMailBody,
  scoreJobAgainstPreference
} from "#@/mail/job-harvest";

describe("canonicalizeJobUrl", () => {
  it("strips LinkedIn tracking to stable job id", () => {
    const raw =
      "https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=abc&refId=xyz&lipi=foo";
    expect(canonicalizeJobUrl(raw)).toBe("https://www.linkedin.com/jobs/view/4443683970");
  });
});

describe("extractJobListingUrls / harvestJobsFromMailBody", () => {
  const linkedInDigest = {
    fromEmail: "jobalerts-noreply@linkedin.com",
    subject: "Frontend Lead – React Native at QNBeyond Plus",
    bodyText: `Your job alert for frontend developer in Cairo
Frontend Lead – React Native | QNBeyond Plus | Cairo, Egypt | Apply with resume & profile | View job: https://www.linkedin.com/comm/jobs/view/4443683970/?trackingId=P%2Bl1q52p1yrPF7miFi2weg%3D%3D&refId=eq25cGj%2Fajoe2CPo%2F7gDbg%3D%3D
Senior Frontend Developer | Speero | Remote | View job: https://www.linkedin.com/comm/jobs/view/4444144767/?trackingId=oVUYe%2FlUi4XPJJCI6HnJQw%3D%3D
https://www.linkedin.com/comm/jobs/search-results/?keywords=frontend
https://www.linkedin.com/comm/mypreferences/u/emailunsub?action=updateEmailSubscription
`,
    bodyHtml: null
  };

  it("extracts job view URLs and skips unsubscribe/search", () => {
    const urls = extractJobListingUrls(linkedInDigest);
    expect(urls.some((u) => u.includes("4443683970"))).toBe(true);
    expect(urls.some((u) => u.includes("4444144767"))).toBe(true);
    expect(urls.every((u) => !u.includes("emailunsub"))).toBe(true);
  });

  it("parses title/company and easy_apply from digest cards", () => {
    const jobs = harvestJobsFromMailBody(linkedInDigest);
    expect(jobs.length).toBeGreaterThanOrEqual(2);
    const first = jobs.find((j) => j.listingUrl.includes("4443683970"));
    expect(first?.title.toLowerCase()).toMatch(/frontend|react/);
    expect(first?.companyName.toLowerCase()).toMatch(/qnbeyond|speero|plus/i);
    expect(first?.applyMethod).toBe("easy_apply");
    expect(first?.source).toBe("linkedin");
  });
});

describe("scoreJobAgainstPreference", () => {
  const job = {
    title: "Senior Frontend Engineer",
    companyName: "Acme",
    location: "Remote",
    listingUrl: "https://www.linkedin.com/jobs/view/1",
    applyMethod: "easy_apply" as const,
    workMode: "remote" as const,
    source: "linkedin" as const
  };

  it("passes when keywords and remote match", () => {
    const r = scoreJobAgainstPreference(job, {
      workModes: ["remote"],
      locations: [],
      roleKeywords: ["frontend", "react"],
      excludeKeywords: [],
      salaryMin: null,
      salaryCurrency: null,
      minMatchScore: 60
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it("hard-fails exclude keywords", () => {
    const r = scoreJobAgainstPreference(job, {
      workModes: ["remote"],
      locations: [],
      roleKeywords: ["frontend"],
      excludeKeywords: ["frontend"],
      salaryMin: null,
      salaryCurrency: null,
      minMatchScore: 60
    });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });
});
