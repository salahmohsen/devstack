import {
  type ExperienceOutput,
  type ProjectOutput,
  type StackOutput
} from "@tsu-stack/core/portfolio";
import { type ContactSchemaSelect } from "@tsu-stack/db/types";

export type StackRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  portfolioEntryId: string | null;
  updatedAt?: Date;
  createdAt?: Date;
};

export function toStackOutput(s: StackRow): StackOutput {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    sortOrder: s.sortOrder,
    portfolioEntryId: s.portfolioEntryId,
    includedInPortfolio: !!s.portfolioEntryId,
    updatedAt: s.updatedAt ?? new Date(),
    createdAt: s.createdAt ?? new Date()
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
  portfolioEntryId: string | null;
  stacks: ProjectStackJoin[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function toProjectOutput(proj: ProjectRow): ProjectOutput {
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
    portfolioEntryId: proj.portfolioEntryId,
    includedInPortfolio: !!proj.portfolioEntryId,
    updatedAt: proj.updatedAt ?? new Date(),
    createdAt: proj.createdAt ?? new Date(),
    stacks: proj.stacks
      .map((join) => (join.stack ? toStackOutput(join.stack) : null))
      .filter((s): s is StackOutput => s !== null)
  };
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

export function toContactOutput(c: ContactSchemaSelect) {
  return {
    type: c.type,
    value: c.value,
    icon: c.icon,
    portfolioEntryId: c.portfolioEntryId ?? null,
    includedInPortfolio: !!c.portfolioEntryId,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt
  };
}
