import { writeFileSync } from "node:fs";

import { expect, it } from "vitest";

import { renderResumePdfBytes } from "#@/routers/resume-pdf";

it("writes a local preview PDF for weight verification", async () => {
  const bytes = await renderResumePdfBytes({
    profile: { name: "Salah Mohsendsdsd", email: "contact@salahmohsen.com" },
    portfolio: {
      experiences: [
        {
          organization: "Ment'ech",
          title: "Senior Frontend Engineer",
          fromDate: "2025-06-01",
          toDate: null,
          isPresent: true,
          description:
            "<ul><li>Architected scalable Next.js App Router platforms supporting operational dashboards, transportation logistics systems, and automotive marketplace applications.</li><li>Standardized frontend architecture patterns and engineering rules used across the team.</li><li>Built reusable schema-driven form systems using TanStack Form + Zod.</li></ul>",
          includedInPortfolio: true
        }
      ],
      projects: [],
      stacks: [],
      contacts: [
        { type: "website", value: "salahmohsen.com", sortOrder: 0 },
        { type: "email", value: "contact@salahmohsen.com", sortOrder: 1 },
        { type: "phone", value: "+201025295958", sortOrder: 2 },
        { type: "location", value: "Cairo - Maadi", sortOrder: 3 }
      ]
    }
  });
  writeFileSync("/tmp/resume-weight-check.pdf", bytes);
  const latin = Buffer.from(bytes).toString("latin1");
  expect(latin).toContain("NotoSans-SemiBold");
  expect(latin).toContain("NotoSans-VF");
});
