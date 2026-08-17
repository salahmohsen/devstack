import { describe, expect, it } from "vitest";

import {
  isSameHubJob,
  latestCrmMail,
  mailIsJobNotifier,
  mailIsUnsorted,
  stageFromLatestCrmMail
} from "#@/mail/hub-mail-crm";

const receipt = {
  id: "m1",
  receivedAt: "2026-01-01T10:00:00.000Z",
  labels: ["application"],
  companyName: "Trivelta",
  title: "Engineer"
};

const laterDigest = {
  id: "m2",
  receivedAt: "2026-01-15T10:00:00.000Z",
  labels: ["job_notifier"],
  companyName: "Trivelta",
  title: null
};

const laterReject = {
  id: "m3",
  receivedAt: "2026-02-01T10:00:00.000Z",
  labels: ["application_status"],
  companyName: "Trivelta",
  title: "Engineer"
};

describe("hub mail CRM helpers", () => {
  it("lets latest CRM mail win and ignores a later notifier", () => {
    expect(latestCrmMail([receipt, laterDigest])?.id).toBe("m1");
    expect(stageFromLatestCrmMail([receipt, laterDigest])).toBe("applied");
    expect(mailIsJobNotifier(laterDigest.labels)).toBe(true);
  });

  it("lets a newer CRM status beat an older receipt", () => {
    expect(latestCrmMail([receipt, laterReject])?.id).toBe("m3");
  });

  it("does not treat notifier as applied", () => {
    expect(stageFromLatestCrmMail([laterDigest])).toBe(null);
  });

  it("treats unsorted as needing classify", () => {
    expect(mailIsUnsorted([])).toBe(true);
    expect(mailIsUnsorted(["rule:airbnb"])).toBe(true);
    expect(mailIsUnsorted(["application"])).toBe(false);
  });

  it("matches the same job by company+title or listing URL", () => {
    expect(
      isSameHubJob(
        { companyName: "Trivelta", title: "Engineer" },
        { companyName: "trivelta", title: "Engineer" }
      )
    ).toBe(true);
    expect(
      isSameHubJob(
        { companyName: "Trivelta", title: "Engineer" },
        { companyName: "Trivelta", title: "Designer" }
      )
    ).toBe(false);
    expect(
      isSameHubJob(
        { listingUrl: "https://jobs.example.com/a" },
        { listingUrl: "https://jobs.example.com/a/" }
      )
    ).toBe(true);
  });
});
