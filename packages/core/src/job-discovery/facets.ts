import { z } from "zod";

export const WorkModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const SeniorityFacetSchema = z.enum([
  "intern",
  "junior",
  "middle",
  "senior",
  "lead",
  "staff",
  "principal",
  "c_level"
]);

export const EmploymentTypeFacetSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "fellowship"
]);

export const CompanyTypeFacetSchema = z.enum([
  "product",
  "startup",
  "outsource",
  "outstaff",
  "agency",
  "inhouse",
  "government"
]);

export const CompanySizeFacetSchema = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+"
]);

export const RealityFacetSchema = z.enum(["fresh", "stale", "likely-evergreen"]);

export const RegionFacetSchema = z.enum([
  "global",
  "north_america",
  "latam",
  "eu",
  "uk",
  "mena",
  "africa",
  "apac",
  "cis",
  "none"
]);

export const CATEGORY_FACET_VALUES = [
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
] as const;

export const CategoryFacetSchema = z.enum(CATEGORY_FACET_VALUES);

export const DOMAIN_FACET_VALUES = [
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
] as const;

export const DomainFacetSchema = z.enum(DOMAIN_FACET_VALUES);

export const COLLECTION_FACET_VALUES = [
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
] as const;

export const CollectionFacetSchema = z.enum(COLLECTION_FACET_VALUES);

/** Open-vocabulary geo/skill chips (countries, cities, skills). */
export const CountryOrCitySchema = z.string().trim().min(1);

export const FACET_KEYS = [
  "regions",
  "countries",
  "cities",
  "categories",
  "skills",
  "seniority",
  "employmentTypes",
  "companyTypes",
  "companySizes",
  "domains",
  "collections",
  "reality"
] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

export const SALARY_CURRENCIES = ["USD", "EUR", "GBP", "RUB"] as const;
export const SalaryCurrencySchema = z.enum(SALARY_CURRENCIES);
export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

/** Closed-vocabulary facet schemas keyed by freehire wire param. */
export const FACETS = {
  work_mode: WorkModeSchema,
  seniority: SeniorityFacetSchema,
  employment_type: EmploymentTypeFacetSchema,
  company_type: CompanyTypeFacetSchema,
  company_size: CompanySizeFacetSchema,
  reality: RealityFacetSchema,
  regions: RegionFacetSchema,
  category: CategoryFacetSchema,
  domains: DomainFacetSchema,
  collections: CollectionFacetSchema
} as const;
export type FacetName = keyof typeof FACETS;
