import { describe, expect, it } from "vitest";

import { JOB_ADAPTER_IDS } from "@tsu-stack/core";

import {
  arbeitnowFeed as arbeitnowFixture,
  freehireSearch as fixture,
  himalayasSearch as himalayasFixture,
  remoteokFeed as remoteokFixture,
  remotiveSearch as remotiveFixture
} from "#@/lib/job-discovery/adapters/__fixtures__/index";
import { normalizeArbeitnowJob } from "#@/lib/job-discovery/adapters/arbeitnow";
import { normalizeFreehireJob } from "#@/lib/job-discovery/adapters/freehire";
import { normalizeHimalayasJob } from "#@/lib/job-discovery/adapters/himalayas";
import { getJobSourceAdapter, jobSourceAdapters } from "#@/lib/job-discovery/adapters/registry";
import { normalizeRemoteokJob } from "#@/lib/job-discovery/adapters/remoteok";
import { normalizeRemotiveJob } from "#@/lib/job-discovery/adapters/remotive";

const ashbyShapedRaw = {
  public_slug: "staff-engineer-acme-latam",
  source: "ashby",
  url: "https://jobs.ashbyhq.com/acme/staff-engineer-latam",
  title: "Staff Engineer",
  company: "Acme",
  location: "LatAm",
  workplaceType: "Remote",
  employmentType: "FullTime"
};

describe("normalizeFreehireJob", () => {
  it("keeps greenhouse and drops himalayas copies", () => {
    const rows = fixture.data.map(normalizeFreehireJob).filter(Boolean);
    expect(
      rows.every(
        (r) =>
          r &&
          ["greenhouse", "ashby", "lever", "workable", "smartrecruiters"].includes(
            r.sourcePlatform ?? ""
          )
      )
    ).toBe(true);
    expect(rows.find((r) => r?.sourcePlatform === "himalayas")).toBeUndefined();
  });

  it("uses public_slug as externalId", () => {
    const row = normalizeFreehireJob(fixture.data[0]);
    expect(row?.externalId).toBe(fixture.data[0].public_slug);
  });

  it("maps Ashby workplaceType, LatAm location, and FullTime", () => {
    const row = normalizeFreehireJob(ashbyShapedRaw);
    expect(row?.workMode).toBe("remote");
    expect(row?.hiringRegion).toBe("latam");
    expect(row?.employmentType).toBe("full_time");
    expect(row?.location).toBe("LatAm");
    expect(row?.sourcePlatform).toBe("ashby");
  });

  it("still maps freehire work_mode and Remote — EU location", () => {
    const row = normalizeFreehireJob(fixture.data[0]);
    expect(row?.workMode).toBe("remote");
    expect(row?.hiringRegion).toBe("eu");
    expect(row?.location).toBe("Remote — EU");
  });
});

describe("normalizeHimalayasJob", () => {
  it("does not throw when timezoneRestrictions are integers", () => {
    expect(() => himalayasFixture.jobs.map(normalizeHimalayasJob)).not.toThrow();
  });

  it("uses guid as externalId and stringifies locationRestrictions", () => {
    const row = normalizeHimalayasJob(himalayasFixture.jobs[0]);
    expect(row?.externalId).toBe("globex-frontend-1");
    expect(row?.location).toBe("United States");
    expect(row?.skills).toEqual([]);
    expect(row?.workMode).toBeNull();
  });
});

describe("normalizeArbeitnowJob", () => {
  it("maps slug and remote flag", () => {
    const row = normalizeArbeitnowJob(arbeitnowFixture.data[0]);
    expect(row?.externalId).toBe("backend-engineer-acme");
    expect(row?.workMode).toBe("remote");
    expect(row?.sourcePlatform).toBe("arbeitnow");
    expect(row?.salaryMin).toBeNull();
  });
});

describe("normalizeRemotiveJob", () => {
  it("does not regex a salary string", () => {
    const row = normalizeRemotiveJob(remotiveFixture.jobs[0]);
    expect(row?.externalId).toBe("99");
    expect(row?.workMode).toBe("remote");
    expect(row?.salaryMin).toBeNull();
    expect(row?.salaryMax).toBeNull();
    expect(row?.location).toBe("Worldwide");
  });
});

describe("normalizeRemoteokJob", () => {
  it("drops the legal first object and keeps the job", () => {
    const rows = remoteokFixture.map(normalizeRemoteokJob).filter(Boolean);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.externalId).toBe("1");
    expect(rows[0]?.title).toBe("Engineer");
    expect(rows[0]?.companyName).toBe("Acme");
  });
});

describe("jobSourceAdapters", () => {
  it("registers every adapter id", () => {
    expect(Object.keys(jobSourceAdapters).toSorted()).toEqual([...JOB_ADAPTER_IDS].toSorted());
    expect(getJobSourceAdapter("freehire").capabilities).toEqual(["search"]);
    expect(getJobSourceAdapter("arbeitnow").capabilities).toEqual(["feed"]);
    expect(getJobSourceAdapter("remoteok").capabilities).toEqual(["feed"]);
  });
});
