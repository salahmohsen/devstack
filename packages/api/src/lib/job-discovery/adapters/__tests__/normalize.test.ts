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
