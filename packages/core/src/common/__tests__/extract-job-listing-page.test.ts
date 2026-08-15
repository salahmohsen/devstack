import { describe, expect, it } from "vitest";

import { extractJobListingStructured } from "#@/common/extract-job-listing-page";

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
});
