import { describe, expect, it } from "vitest";

import {
  decodeHtmlEntities,
  extractExperienceFromDescription,
  extractGuestJobCriteria,
  extractJobListingStructured,
  listingAlternateTextUrl,
  parseHiringPageTitle,
  pickBetterListingDescription,
  stripHtmlToPlainText
} from "#@/common/extract-job-listing-page";

const JSON_LD_JD =
  "<p>We need a senior frontend engineer with React, TypeScript, and system design experience across large product surfaces.</p><p>Remote-friendly team with strong design partnership.</p><p>You will own complex UI systems, mentor other engineers, partner with product, and ship high-quality experiences used by thousands of customers every day.</p>";

function jsonLdHtml(jobPosting: Record<string, unknown>): string {
  return `<html><head>
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: "Senior Frontend Engineer",
      description: JSON_LD_JD,
      hiringOrganization: { "@type": "Organization", name: "Acme Labs" },
      ...jobPosting
    })}
    </script>
  </head><body></body></html>`;
}

describe("extractJobListingStructured JSON-LD workplace fields", () => {
  it("maps TELECOMMUTE, employmentType, applicantLocationRequirements, and skills", () => {
    const e = extractJobListingStructured(
      jsonLdHtml({
        jobLocationType: "TELECOMMUTE",
        employmentType: "FULL_TIME",
        applicantLocationRequirements: { "@type": "Country", name: "United States" },
        skills: ["TypeScript", "React"]
      })
    );

    expect(e.workMode).toBe("remote");
    expect(e.workModeStated).toBe(true);
    expect(e.employmentType).toBe("full_time");
    expect(e.hiringRegion).toBe("us");
    expect(e.skills).toEqual(["TypeScript", "React"]);
    expect(e.descriptionSource).toBe("jsonld");
  });

  it("maps LatAm applicant location on a telecommute posting", () => {
    const e = extractJobListingStructured(
      jsonLdHtml({
        jobLocationType: "TELECOMMUTE",
        employmentType: ["FULL_TIME"],
        applicantLocationRequirements: [{ "@type": "AdministrativeArea", name: "LatAm" }]
      })
    );

    expect(e.workMode).toBe("remote");
    expect(e.hiringRegion).toBe("latam");
    expect(e.employmentType).toBe("full_time");
  });

  it("maps JSON-LD baseSalary to salaryMin, currency, and period", () => {
    const e = extractJobListingStructured(
      jsonLdHtml({
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "usd",
          value: {
            "@type": "QuantitativeValue",
            minValue: 4000,
            unitText: "MONTH"
          }
        }
      })
    );
    expect(e.salaryMin).toBe(4000);
    expect(e.salaryCurrency).toBe("USD");
    expect(e.salaryPeriod).toBe("month");
  });

  it("leaves salary fields null when JSON-LD has no baseSalary", () => {
    const e = extractJobListingStructured(jsonLdHtml({}));
    expect(e.salaryMin ?? null).toBeNull();
    expect(e.salaryCurrency ?? null).toBeNull();
    expect(e.salaryPeriod ?? null).toBeNull();
  });
});

describe("LinkedIn guest criteria and entities", () => {
  it("decodes &apos; and numeric entities", () => {
    expect(decodeHtmlEntities("Don&apos;t just apply")).toBe("Don't just apply");
    expect(stripHtmlToPlainText("<p>Don&apos;t just apply</p>")).toBe("Don't just apply");
  });

  it("parses hiring titles without treating LinkedIn as the company", () => {
    expect(
      parseHiringPageTitle(
        "Yassir hiring Senior Frontend Engineer in Cairo, Cairo, Egypt | LinkedIn"
      )
    ).toEqual({
      companyName: "Yassir",
      title: "Senior Frontend Engineer",
      location: "Cairo, Cairo, Egypt"
    });
  });

  it("reads Full-time from job-criteria and does not invent Hybrid", () => {
    const html = `
      <ul class="description__job-criteria-list">
        <li class="description__job-criteria-item">
          <h3 class="description__job-criteria-subheader">Employment type</h3>
          <span class="description__job-criteria-text">Full-time</span>
        </li>
        <li class="description__job-criteria-item">
          <h3 class="description__job-criteria-subheader">Job function</h3>
          <span class="description__job-criteria-text">Engineering and Information Technology</span>
        </li>
      </ul>`;
    const criteria = extractGuestJobCriteria(html);
    expect(criteria.employmentType).toBe("full_time");
    expect(criteria.workMode).toBeUndefined();
    expect(criteria.department).toMatch(/Engineering/);
    const structured = extractJobListingStructured(`<html><body>${html}</body></html>`);
    expect(structured.employmentType).toBe("full_time");
    expect(structured.workMode).toBeUndefined();
  });

  it("reads Hybrid only when workplace type is stated", () => {
    const html = `
      <h3 class="description__job-criteria-subheader">Workplace type</h3>
      <span class="description__job-criteria-text">Hybrid</span>
      <h3 class="description__job-criteria-subheader">Employment type</h3>
      <span class="description__job-criteria-text">Full-time</span>`;
    expect(extractGuestJobCriteria(html)).toMatchObject({
      workMode: "hybrid",
      workModeStated: true,
      employmentType: "full_time"
    });
  });

  it("extracts at least N years of experience", () => {
    expect(
      extractExperienceFromDescription(
        "Must have technical skills with at least 5 years of experience"
      )
    ).toMatch(/5 years/i);
  });
});

describe("listingAlternateTextUrl", () => {
  const pageUrl = "https://apply.workable.com/eventogy/j/1F0306BC0A";

  it("reads same-host rel=alternate markdown (any attribute order)", () => {
    const html = `<html><head>
      <link rel="alternate" type="text/plain" title="LLMs" href="https://apply.workable.com/eventogy/llms.txt"/>
      <link href="https://apply.workable.com/eventogy/jobs/view/1F0306BC0A.md" type="text/markdown" title="Markdown version" rel="alternate"/>
    </head></html>`;
    expect(listingAlternateTextUrl(html, pageUrl)).toBe(
      "https://apply.workable.com/eventogy/jobs/view/1F0306BC0A.md"
    );
  });

  it("resolves a relative markdown href against the listing URL", () => {
    const html = `<link rel="alternate" type="text/markdown" href="/eventogy/jobs/view/1F0306BC0A.md">`;
    expect(listingAlternateTextUrl(html, pageUrl)).toBe(
      "https://apply.workable.com/eventogy/jobs/view/1F0306BC0A.md"
    );
  });

  it("drops a different-host alternate and ignores company llms.txt", () => {
    const html = `<html><head>
      <link rel="alternate" type="text/plain" href="https://apply.workable.com/eventogy/llms.txt"/>
      <link rel="alternate" type="text/markdown" href="https://evil.example/job.md"/>
    </head></html>`;
    expect(listingAlternateTextUrl(html, pageUrl)).toBeNull();
  });
});

describe("pickBetterListingDescription", () => {
  it("keeps a longer stored JD over an og:description teaser", () => {
    const stored =
      "<p>We are a highly successful UK based Events Management SaaS company looking for an ambitious Next.js Product Developer to help oversee the next phase of development of our suite of products.</p>";
    const teaser =
      "STRICTLY NO AGENCIES: We are only accepting direct applications for this role. Any unsolicited CVs sent will be treated as a gift and will not be subject to any terms or fees.RECRUITERS: DO NOT CALL OR EMAIL US REGARDING THESE ROLESTHIS IS A HYBRID ROL...";
    const picked = pickBetterListingDescription(stored, teaser);
    expect(picked).toMatch(/Next\.js Product Developer/);
    expect(picked).not.toMatch(/HYBRID ROL\.\.\./);
  });
});
