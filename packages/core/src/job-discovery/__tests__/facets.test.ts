import { describe, expect, it } from "vitest";

import { type FacetName } from "#@/job-discovery/facets";
import {
  CATEGORY_FACET_VALUES,
  COLLECTION_FACET_VALUES,
  CollectionFacetSchema,
  DOMAIN_FACET_VALUES,
  DomainFacetSchema,
  FACETS,
  SALARY_CURRENCIES,
  SalaryCurrencySchema
} from "#@/job-discovery/facets";

const FACET_VOCABULARIES: [FacetName, readonly string[]][] = [
  ["work_mode", ["remote", "hybrid", "onsite"]],
  ["seniority", ["intern", "junior", "middle", "senior", "lead", "staff", "principal", "c_level"]],
  ["employment_type", ["full_time", "part_time", "contract", "internship", "fellowship"]],
  [
    "company_type",
    ["product", "startup", "outsource", "outstaff", "agency", "inhouse", "government"]
  ],
  ["company_size", ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]],
  ["reality", ["fresh", "stale", "likely-evergreen"]],
  [
    "regions",
    ["global", "north_america", "latam", "eu", "uk", "mena", "africa", "apac", "cis", "none"]
  ],
  [
    "category",
    [
      "software_engineering",
      "backend",
      "frontend",
      "fullstack",
      "mobile",
      "devops",
      "sre",
      "network_engineering",
      "data_engineering",
      "data_science",
      "data_analytics",
      "ml_ai",
      "ai_engineering",
      "qa",
      "security",
      "hardware",
      "embedded",
      "blockchain",
      "architecture",
      "design",
      "creative",
      "engineering_design",
      "industrial_engineering",
      "product",
      "project_management",
      "management",
      "healthcare",
      "skilled_trades",
      "retail",
      "hospitality",
      "logistics",
      "education",
      "personal_services",
      "administration",
      "marketing",
      "sales",
      "support",
      "business_analysis",
      "solutions_engineering",
      "developer_relations",
      "technical_writing",
      "recruiting",
      "hr",
      "finance",
      "legal",
      "operations",
      "customer_success",
      "other"
    ]
  ],
  [
    "domains",
    [
      "fintech",
      "crypto",
      "ecommerce",
      "gambling",
      "gamedev",
      "media",
      "travel",
      "healthcare",
      "edtech",
      "govtech",
      "devtools",
      "cybersecurity",
      "ai",
      "hrtech",
      "adtech",
      "proptech",
      "logistics",
      "mobility",
      "climatetech",
      "other"
    ]
  ],
  [
    "collections",
    [
      "yc",
      "techstars",
      "a16z-portfolio",
      "a16z-speedrun",
      "european",
      "ai",
      "mag7",
      "bigtech",
      "unicorn",
      "fortune500",
      "eastern-roots",
      "indian-roots",
      "ai-native",
      "uk-skilled-worker-sponsor",
      "nl-recognised-sponsor",
      "us-h1b-sponsor"
    ]
  ]
];

describe("freehire facet whitelists", () => {
  it.each(FACET_VOCABULARIES)("%s whitelist", (facet, values) => {
    for (const value of values) {
      expect(FACETS[facet].safeParse(value).success).toBe(true);
    }
    expect(FACETS[facet].safeParse("bogus").success).toBe(false);
  });

  it("category vocabulary is not truncated", () => {
    expect(CATEGORY_FACET_VALUES.length).toBeGreaterThanOrEqual(45);
    expect([...CATEGORY_FACET_VALUES].toSorted()).toEqual(
      FACET_VOCABULARIES.find(([facet]) => facet === "category")![1]
        .slice()
        .toSorted()
    );
  });

  it("domain and collection vocabularies are complete", () => {
    expect([...DOMAIN_FACET_VALUES].toSorted()).toEqual(
      FACET_VOCABULARIES.find(([facet]) => facet === "domains")![1]
        .slice()
        .toSorted()
    );
    expect([...COLLECTION_FACET_VALUES].toSorted()).toEqual(
      FACET_VOCABULARIES.find(([facet]) => facet === "collections")![1]
        .slice()
        .toSorted()
    );
    expect(DomainFacetSchema.safeParse("bogus").success).toBe(false);
    expect(CollectionFacetSchema.safeParse("bogus").success).toBe(false);
  });

  it("locks salary currencies to USD/EUR/GBP/RUB", () => {
    expect([...SALARY_CURRENCIES]).toEqual(["USD", "EUR", "GBP", "RUB"]);
    for (const value of SALARY_CURRENCIES) {
      expect(SalaryCurrencySchema.safeParse(value).success).toBe(true);
    }
    expect(SalaryCurrencySchema.safeParse("AED").success).toBe(false);
  });
});
