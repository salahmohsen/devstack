import {
  aggregateStacksByType,
  type ExperienceOutput,
  type ExperiencePublicOutput,
  type ProjectOutput,
  type ProjectPublicOutput,
  type StackOutput
} from "@tsu-stack/core";
import { type ContactSchemaSelect } from "@tsu-stack/db/types";

export type StackRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  type: string | null;
  healthStatus: {
    deprecated?: boolean;
    downloads?: number;
    lastPublished?: string;
  } | null;
  confidence: string | null;
  projectCount?: number;
  sortOrder: number;
  portfolioEntryId: string | null;
  dependencies?: Array<{
    npmPackage: string;
    description: string | null;
    homepage: string | null;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    logo: string | null;
  }>;
  updatedAt?: Date;
  createdAt?: Date;
};

export function toStackOutput(s: StackRow): StackOutput {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    type: s.type,
    healthStatus: s.healthStatus,
    confidence: s.confidence,
    projectCount: s.projectCount ?? 0,
    sortOrder: s.sortOrder,
    portfolioEntryId: s.portfolioEntryId,
    includedInPortfolio: !!s.portfolioEntryId,
    dependencies: (s.dependencies ?? []).map((d) => {
      return {
        npmPackage: d.npmPackage,
        description: d.description,
        homepage: d.homepage
      };
    }),
    updatedAt: s.updatedAt ?? new Date(),
    createdAt: s.createdAt ?? new Date(),
    projects: (s.projects ?? []).map((p) => {
      return {
        id: p.id,
        name: p.name,
        logo: p.logo
      };
    })
  };
}

export type ProjectStackJoin = {
  id: string;
  projectId: string;
  stackId: string;
  stack: StackRow | null;
};

export type ProjectRow = {
  id: string;
  logo: string | null;
  repos: string[] | null;
  demoUrl: string | null;
  year: number;
  title: string;
  summary: string;
  description: string;
  sortOrder: number;
  experienceId: string | null;
  isArchived?: boolean | null;
  isPresent?: boolean | null;
  analysis: string | null;
  portfolioEntryId: string | null;
  stacks: ProjectStackJoin[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function toProjectOutput(proj: ProjectRow): ProjectOutput {
  const stacks = proj.stacks
    .map((join) => (join.stack ? toStackOutput(join.stack) : null))
    .filter((s): s is StackOutput => s !== null);

  return {
    id: proj.id,
    logo: proj.logo,
    repos: proj.repos ?? [],
    demoUrl: proj.demoUrl,
    year: proj.year,
    title: proj.title,
    summary: proj.summary,
    description: proj.description,
    sortOrder: proj.sortOrder,
    experienceId: proj.experienceId,
    isArchived: proj.isArchived ?? false,
    isPresent: proj.isPresent ?? false,
    analysis: proj.analysis,
    portfolioEntryId: proj.portfolioEntryId,
    includedInPortfolio: !!proj.portfolioEntryId,
    updatedAt: proj.updatedAt ?? new Date(),
    createdAt: proj.createdAt ?? new Date(),
    stacks,
    stackTypeSummary: aggregateStacksByType(stacks)
  };
}

export function toProjectPublicOutput(proj: ProjectRow): ProjectPublicOutput {
  const { analysis: _analysis, ...publicFields } = toProjectOutput(proj);
  return { ...publicFields, githubRepos: [] };
}

export type ExperienceRow = {
  id: string;
  title: string;
  organization: string;
  description: string;
  fromDate: string | null;
  toDate: string | null;
  sortOrder: number;
  isPresent: boolean | null;
  portfolioEntryId: string | null;
  projects: ProjectRow[];
  createdAt: Date;
  updatedAt: Date;
};

export function toExperienceOutput(exp: ExperienceRow): ExperienceOutput {
  return {
    id: exp.id,
    title: exp.title,
    organization: exp.organization,
    description: exp.description,
    fromDate: exp.fromDate,
    toDate: exp.toDate,
    sortOrder: exp.sortOrder,
    isPresent: exp.isPresent ?? false,
    portfolioEntryId: exp.portfolioEntryId,
    includedInPortfolio: !!exp.portfolioEntryId,
    projects: exp.projects.map(toProjectOutput),
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt
  };
}

export function toExperiencePublicOutput(exp: ExperienceRow): ExperiencePublicOutput {
  return {
    id: exp.id,
    title: exp.title,
    organization: exp.organization,
    description: exp.description,
    fromDate: exp.fromDate,
    toDate: exp.toDate,
    sortOrder: exp.sortOrder,
    isPresent: exp.isPresent ?? false,
    portfolioEntryId: exp.portfolioEntryId,
    includedInPortfolio: !!exp.portfolioEntryId,
    projects: exp.projects.map(toProjectPublicOutput),
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt
  };
}

export function toContactOutput(c: ContactSchemaSelect) {
  return {
    id: c.id,
    type: c.type,
    value: c.value,
    sortOrder: c.sortOrder,
    portfolioEntryId: c.portfolioEntryId ?? null,
    includedInPortfolio: !!c.portfolioEntryId,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt
  };
}
