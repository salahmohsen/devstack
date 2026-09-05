import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { FreehireAgentJobSchema } from "#@/lib/job-discovery/freehire/client";
import { toUserJobRow } from "#@/lib/job-discovery/freehire/map";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../__fixtures__/agent-search.json"),
    "utf8"
  )
) as { data: unknown[]; meta: { total: number } };

const jobs = fixture.data.map((job) => FreehireAgentJobSchema.parse(job));

const META = { userId: "u1", queryHash: "h1234", queryFilters: { regions: ["eu"] } };

describe("toUserJobRow", () => {
  it("maps a rich freehire job to a user_job snapshot row", () => {
    const rich = jobs[0]!;
    const row = toUserJobRow(rich, META);
    expect(row).toMatchObject({
      userId: "u1",
      freehireSlug: rich.public_slug,
      title: rich.title,
      companyName: rich.company,
      companySlug: rich.company_slug,
      listingUrl: rich.url,
      workMode: "remote",
      location: rich.location,
      employmentType: rich.enrichment?.employment_type ?? null,
      seniority: "senior",
      experienceYearsMin: rich.enrichment?.experience_years_min ?? null,
      category: rich.enrichment?.category ?? null,
      summary: rich.enrichment?.summary ?? null,
      domains: rich.enrichment?.domains ?? [],
      skills: rich.skills ?? [],
      reality: "fresh",
      source: rich.source,
      queryHash: "h1234",
      queryFilters: { regions: ["eu"] }
    });
    expect(row.companyLogoUrl).toBeNull();
    expect(row.postedAt).toEqual(new Date(rich.posted_at!));
    expect(row.description).not.toMatch(/<script|onerror/i);
    expect(row.description).toContain("<p");
  });

  it("maps a thin enrichment_version:0 stub without throwing", () => {
    const thin = jobs.find((job) => (job.enrichment_version ?? 0) === 0);
    expect(thin).toBeDefined();
    const row = toUserJobRow(thin!, META);
    expect(row.freehireSlug).toBe(thin!.public_slug);
    expect(row.title).toBe(thin!.title);
    expect(row.companyName).toBe(thin!.company);
    expect(row.listingUrl).toBe(thin!.url);
    expect(row.salaryMin).toBeNull();
    expect(row.salaryMax).toBeNull();
    expect(row.salaryCurrency).toBeNull();
    expect(row.experienceYearsMin).toBeNull();
    expect(row.seniority).toBeNull();
    expect(row.category).toBeNull();
    expect(row.summary).toBeNull();
  });

  it("sanitizes scripts, event handlers, and javascript: links out of the description", () => {
    const job = FreehireAgentJobSchema.parse({
      public_slug: "evil-job",
      url: "https://example.com/evil",
      title: "Evil",
      company: "EvilCo",
      work_mode: "remote",
      enrichment_version: 2,
      description:
        '<p>Apply now<script>alert(1)</script><img src="x" onerror="steal()">' +
        '<a href="javascript:alert(1)">click</a><a href="https://ok.example/apply">ok</a>' +
        "<style>.x{}</style><iframe src=//evil.example></iframe>",
      enrichment: { summary: "s", seniority: "senior", category: "backend" }
    });
    const row = toUserJobRow(job, META);
    expect(row.description).not.toMatch(/<script|onerror|javascript:|<img|<style|<iframe/i);
    expect(row.description).toContain('href="https://ok.example/apply"');
    expect(row.description).toContain("<p>Apply now");
  });

  it("keeps rows null-safe when the job omits optional fields entirely", () => {
    const job = FreehireAgentJobSchema.parse({
      public_slug: "bare-job",
      url: "https://example.com/bare",
      title: "Bare"
    });
    const row = toUserJobRow(job, META);
    expect(row).toMatchObject({
      freehireSlug: "bare-job",
      companyName: "Bare",
      workMode: null,
      skills: [],
      domains: [],
      description: null,
      postedAt: null,
      reality: null,
      source: null
    });
  });

  it("nulls a malformed posted_at instead of storing an Invalid Date", () => {
    const job = FreehireAgentJobSchema.parse({
      public_slug: "bad-date-job",
      url: "https://example.com/bad-date",
      title: "Bad Date",
      company: "Dateless Co",
      posted_at: "not-a-timestamp"
    });
    const row = toUserJobRow(job, META);
    expect(row.postedAt).toBeNull();
  });
});
