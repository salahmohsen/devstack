import { z } from "zod";

export const JOB_TITLE_PACK_IDS = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "data_ml",
  "devops",
  "product",
  "design",
  "qa",
  "security",
  "eng_manager",
  "devrel",
  "data_analyst",
  "solutions"
] as const;

export type JobTitlePackId = (typeof JOB_TITLE_PACK_IDS)[number];
export type JobTitleId = JobTitlePackId | "custom";

export const JobTitlePackIdSchema = z.enum(JOB_TITLE_PACK_IDS);
export const JobTitleIdSchema = z.enum([...JOB_TITLE_PACK_IDS, "custom"]);

export type TitlePack = {
  id: JobTitlePackId;
  label: string;
  keywords: string[];
};

/** Seed keywords copied verbatim from the job-discovery adapters design title-packs table. */
export const TITLE_PACKS: Record<JobTitlePackId, TitlePack> = {
  frontend: {
    id: "frontend",
    label: "Frontend Engineer",
    keywords: ["frontend", "front-end", "react", "typescript", "next.js", "nextjs", "ui engineer"]
  },
  backend: {
    id: "backend",
    label: "Backend Engineer",
    keywords: ["backend", "back-end", "api", "node", "java", "golang", "python", "postgres"]
  },
  fullstack: {
    id: "fullstack",
    label: "Full-stack Engineer",
    keywords: ["fullstack", "full-stack", "frontend", "backend", "react", "node", "typescript"]
  },
  mobile: {
    id: "mobile",
    label: "Mobile Engineer",
    keywords: ["mobile", "ios", "android", "react native", "flutter", "swift", "kotlin"]
  },
  data_ml: {
    id: "data_ml",
    label: "Data / ML",
    keywords: [
      "data scientist",
      "machine learning",
      "ml engineer",
      "data engineer",
      "python",
      "pytorch"
    ]
  },
  devops: {
    id: "devops",
    label: "DevOps / Platform",
    keywords: ["devops", "platform", "sre", "kubernetes", "infra", "terraform", "aws"]
  },
  product: {
    id: "product",
    label: "Product Manager",
    keywords: ["product manager", "pm", "product owner"]
  },
  design: {
    id: "design",
    label: "Product Designer",
    keywords: ["product designer", "ux", "ui designer", "figma"]
  },
  qa: {
    id: "qa",
    label: "QA / SET",
    keywords: ["qa", "quality", "sdet", "test engineer", "automation"]
  },
  security: {
    id: "security",
    label: "Security Engineer",
    keywords: ["security", "appsec", "pentester", "infosec"]
  },
  eng_manager: {
    id: "eng_manager",
    label: "EM / Manager",
    keywords: ["engineering manager", "em", "head of engineering"]
  },
  devrel: {
    id: "devrel",
    label: "DevRel",
    keywords: ["developer advocate", "devrel", "dx engineer"]
  },
  data_analyst: {
    id: "data_analyst",
    label: "Data Analyst",
    keywords: ["data analyst", "analytics", "bi", "sql"]
  },
  solutions: {
    id: "solutions",
    label: "Solutions Engineer",
    keywords: ["solutions engineer", "sales engineer", "se"]
  }
};

export const JOB_ADAPTER_IDS = [
  "freehire",
  "himalayas",
  "arbeitnow",
  "remotive",
  "remoteok"
] as const;

export type JobAdapterId = (typeof JOB_ADAPTER_IDS)[number];

/** freehire `source=` allowlist — drop aggregator copies we fetch ourselves. */
export const FREEHIRE_ATS_SOURCES = [
  "greenhouse",
  "ashby",
  "lever",
  "workable",
  "smartrecruiters"
] as const;

export type FreehireAtsSource = (typeof FREEHIRE_ATS_SOURCES)[number];

export const DEFAULT_JOBS_PER_RUN = 25;
export const MIN_JOBS_PER_RUN = 15;
export const MAX_JOBS_PER_RUN = 40;
export const JOBS_PER_RUN_STEP = 5;
export const MAX_OPEN_INBOX = 50;
export const INBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LIVENESS_AFTER_MS = Math.floor(INBOX_TTL_MS / 2); // ~3.5d

/** Snap to 15/20/25/30/35/40 (nearest step, clamped). */
export function refineJobsPerRun(n: number): number {
  const clamped = Math.min(MAX_JOBS_PER_RUN, Math.max(MIN_JOBS_PER_RUN, n));
  const stepsFromMin = Math.round((clamped - MIN_JOBS_PER_RUN) / JOBS_PER_RUN_STEP);
  const snapped = MIN_JOBS_PER_RUN + stepsFromMin * JOBS_PER_RUN_STEP;
  return Math.min(MAX_JOBS_PER_RUN, Math.max(MIN_JOBS_PER_RUN, snapped));
}

export function dailyAiAttemptCap(jobsPerRun: number): number {
  return 2 * jobsPerRun;
}
