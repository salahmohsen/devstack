import {
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  sql,
  type SQL
} from "drizzle-orm";

import {
  getListQueryAllowlist,
  ListQueryError,
  parseRsql,
  type ListQueryAst,
  type ListQueryCmp,
  type ListQueryResource
} from "@tsu-stack/core";
import {
  application,
  experience,
  jobPosting,
  project,
  projectStack,
  resume,
  stack
} from "@tsu-stack/db/schema";

export const SKILLS_LIST_SORT_KEYS = ["sortOrder", "name", "projectCount", "updatedAt"] as const;
export type SkillsListSortKey = (typeof SKILLS_LIST_SORT_KEYS)[number];

export const EXPERIENCES_LIST_SORT_KEYS = ["sortOrder", "fromDate", "title", "updatedAt"] as const;
export type ExperiencesListSortKey = (typeof EXPERIENCES_LIST_SORT_KEYS)[number];

export const PROJECTS_LIST_SORT_KEYS = ["sortOrder", "year", "title", "updatedAt"] as const;
export type ProjectsListSortKey = (typeof PROJECTS_LIST_SORT_KEYS)[number];

export const RESUMES_LIST_SORT_KEYS = ["updatedAt", "createdAt"] as const;
export type ResumesListSortKey = (typeof RESUMES_LIST_SORT_KEYS)[number];

export const APPLICATIONS_LIST_SORT_KEYS = ["matchScore", "updatedAt", "company", "stage"] as const;
export type ApplicationsListSortKey = (typeof APPLICATIONS_LIST_SORT_KEYS)[number];

export type CompiledListQuery<K extends string = string> = {
  where?: SQL;
  sortBy: K;
  sortDir: "asc" | "desc";
};

export type CompileListQueryInput = {
  resource: ListQueryResource;
  q?: string;
  filter?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /**
   * Tracked board: strip every outcome leaf (including unrestricted), then
   * AND `outcome IS NULL`. Do not AND the URL outcome with IS NULL.
   */
  board?: boolean;
};

const ASC_SORT_KEYS = new Set(["title", "name", "company", "stage"]);
const NEW_JOBS_SEED_RSQL = "trackingStatus==inbox";
const TRACKED_SEED_RSQL = "outcome==null";

function andAll(parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return and(...present);
}

function compileAst(ast: ListQueryAst, compileCmp: (cmp: ListQueryCmp) => SQL): SQL | undefined {
  if (ast.type === "cmp") return compileCmp(ast);
  const children = ast.children.map((child) => compileAst(child, compileCmp));
  const present = children.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return ast.type === "and" ? and(...present) : or(...present);
}

function compileQ(q: string | undefined): string | undefined {
  const trimmed = q?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function ilikePattern(q: string): string {
  return `%${q}%`;
}

function compileIncludedInPortfolio(column: Parameters<typeof isNull>[0], cmp: ListQueryCmp): SQL {
  const value = cmp.args[0] === "true";
  const included = cmp.op === "neq" ? !value : value;
  return included ? isNotNull(column) : isNull(column);
}

function catalogSortDir(key: string, sortDir?: "asc" | "desc"): "asc" | "desc" {
  return sortDir ?? (ASC_SORT_KEYS.has(key) ? "asc" : "desc");
}

function compileCatalogSort<K extends string>(
  resource: ListQueryResource,
  sortBy: string | undefined,
  sortDir: "asc" | "desc" | undefined,
  defaultKey: K
): { sortBy: K; sortDir: "asc" | "desc" } {
  const allowlist = getListQueryAllowlist(resource);
  if (!sortBy || sortBy === defaultKey) {
    return { sortBy: defaultKey, sortDir: sortDir ?? "asc" };
  }
  if (!allowlist.sortKeys.includes(sortBy)) {
    throw new ListQueryError(`Unknown sort key: ${sortBy}`);
  }
  return { sortBy: sortBy as K, sortDir: catalogSortDir(sortBy, sortDir) };
}

function stackProjectsExist(projectIds: string[], negate: boolean): SQL {
  const existsSql = sql`exists (select 1 from ${projectStack} where ${and(
    eq(projectStack.stackId, stack.id),
    inArray(projectStack.projectId, projectIds)
  )})`;
  return negate ? not(existsSql) : existsSql;
}

function projectStacksExist(stackIds: string[], negate: boolean): SQL {
  const existsSql = sql`exists (select 1 from ${projectStack} where ${and(
    eq(projectStack.projectId, project.id),
    inArray(projectStack.stackId, stackIds)
  )})`;
  return negate ? not(existsSql) : existsSql;
}

/** Same linked-job definition as `withLinkedJobs`: application.resumeId or apply-package prompt. */
function resumeLinkedJobExists(opts?: { titleOrCompanyIlike?: string }): SQL {
  const pred = andAll([
    eq(application.userId, resume.userId),
    or(
      eq(application.resumeId, resume.id),
      sql`${resume.prompt} = ('apply-package:' || ${application.id})`
    ),
    opts?.titleOrCompanyIlike
      ? or(
          ilike(application.title, opts.titleOrCompanyIlike),
          ilike(application.companyName, opts.titleOrCompanyIlike)
        )
      : undefined
  ]);
  if (!pred) {
    throw new Error("Resume linked-job predicate is empty");
  }
  return sql`exists (select 1 from ${application} where ${pred})`;
}

function compileSkillsQ(q: string | undefined): SQL | undefined {
  const trimmed = compileQ(q);
  if (!trimmed) return undefined;
  const pattern = ilikePattern(trimmed);
  // jsonb_array_elements_text is set-returning — wrap in EXISTS so rows are not duplicated.
  return or(
    ilike(stack.name, pattern),
    sql`exists (select 1 from jsonb_array_elements_text(${stack.aliases}) as alias(name) where alias.name ilike ${pattern})`
  );
}

function compileSkillsCmp(cmp: ListQueryCmp): SQL {
  switch (cmp.field) {
    case "includedInPortfolio":
      return compileIncludedInPortfolio(stack.portfolioEntryId, cmp);
    case "isFeatured": {
      const value = cmp.args[0] === "true";
      return cmp.op === "neq" ? ne(stack.isFeatured, value) : eq(stack.isFeatured, value);
    }
    case "type": {
      const [first] = cmp.args;
      if (cmp.op === "eq" && first !== undefined) return eq(stack.type, first);
      if (cmp.op === "neq" && first !== undefined) return ne(stack.type, first);
      if (cmp.op === "in") return inArray(stack.type, cmp.args);
      if (cmp.op === "out") return notInArray(stack.type, cmp.args);
      break;
    }
    case "projects":
      if (cmp.op === "in") return stackProjectsExist(cmp.args, false);
      if (cmp.op === "out") return stackProjectsExist(cmp.args, true);
      break;
    default:
      break;
  }
  throw new ListQueryError(`Unsupported skills filter: ${cmp.field} ${cmp.op}`);
}

function compileExperiencesQ(q: string | undefined): SQL | undefined {
  const trimmed = compileQ(q);
  if (!trimmed) return undefined;
  const pattern = ilikePattern(trimmed);
  return or(ilike(experience.title, pattern), ilike(experience.organization, pattern));
}

function compileExperiencesCmp(cmp: ListQueryCmp): SQL {
  if (cmp.field === "includedInPortfolio") {
    return compileIncludedInPortfolio(experience.portfolioEntryId, cmp);
  }
  throw new ListQueryError(`Unsupported experiences filter: ${cmp.field} ${cmp.op}`);
}

function compileProjectsQ(q: string | undefined): SQL | undefined {
  const trimmed = compileQ(q);
  if (!trimmed) return undefined;
  return ilike(project.title, ilikePattern(trimmed));
}

function compileProjectsCmp(cmp: ListQueryCmp): SQL {
  switch (cmp.field) {
    case "includedInPortfolio":
      return compileIncludedInPortfolio(project.portfolioEntryId, cmp);
    case "stacks":
      if (cmp.op === "in") return projectStacksExist(cmp.args, false);
      if (cmp.op === "out") return projectStacksExist(cmp.args, true);
      break;
    default:
      break;
  }
  throw new ListQueryError(`Unsupported projects filter: ${cmp.field} ${cmp.op}`);
}

function compileResumesQ(q: string | undefined): SQL | undefined {
  const trimmed = compileQ(q);
  if (!trimmed) return undefined;
  const pattern = ilikePattern(trimmed);
  return or(
    ilike(resume.filename, pattern),
    resumeLinkedJobExists({ titleOrCompanyIlike: pattern })
  );
}

function compileResumesCmp(cmp: ListQueryCmp): SQL {
  if (cmp.field === "tiedToJob") {
    const existsSql = resumeLinkedJobExists();
    if (cmp.op === "empty") return not(existsSql);
    if (cmp.op === "not_empty") return existsSql;
  }
  throw new ListQueryError(`Unsupported resumes filter: ${cmp.field} ${cmp.op}`);
}

function compileResumesSort(
  sortBy?: string,
  sortDir?: "asc" | "desc"
): { sortBy: ResumesListSortKey; sortDir: "asc" | "desc" } {
  const allowlist = getListQueryAllowlist("resumes");
  if (!sortBy) {
    return { sortBy: "updatedAt", sortDir: sortDir ?? "desc" };
  }
  if (!allowlist.sortKeys.includes(sortBy)) {
    throw new ListQueryError(`Unknown sort key: ${sortBy}`);
  }
  return { sortBy: sortBy as ResumesListSortKey, sortDir: catalogSortDir(sortBy, sortDir) };
}

function resolveJobsFilter(resource: "new-jobs" | "tracked-jobs", filter?: string): string {
  const trimmed = filter?.trim();
  if (trimmed) return trimmed;
  return resource === "new-jobs" ? NEW_JOBS_SEED_RSQL : TRACKED_SEED_RSQL;
}

function jobsPartition(resource: "new-jobs" | "tracked-jobs"): SQL {
  if (resource === "new-jobs") {
    return inArray(application.trackingStatus, ["inbox", "dismissed"]);
  }
  return eq(application.trackingStatus, "tracked");
}

/** Drop every outcome comparison, including `outcome=unrestricted=`. */
function stripOutcomeLeaves(ast: ListQueryAst): ListQueryAst | undefined {
  if (ast.type === "cmp") return ast.field === "outcome" ? undefined : ast;
  const children = ast.children
    .map((child) => stripOutcomeLeaves(child))
    .filter((child): child is ListQueryAst => child !== undefined);
  if (children.length === 0) return undefined;
  if (children.length === 1) return children[0];
  return { type: ast.type, children };
}

function compileJobsQ(q: string | undefined): SQL | undefined {
  const trimmed = compileQ(q);
  if (!trimmed) return undefined;
  const pattern = ilikePattern(trimmed);
  return or(ilike(application.title, pattern), ilike(application.companyName, pattern));
}

function compileJobsSort(
  resource: "new-jobs" | "tracked-jobs",
  sortBy?: string,
  sortDir?: "asc" | "desc"
): { sortBy: ApplicationsListSortKey; sortDir: "asc" | "desc" } {
  const allowlist = getListQueryAllowlist(resource);
  const defaultKey: ApplicationsListSortKey = resource === "new-jobs" ? "matchScore" : "updatedAt";
  if (!sortBy || sortBy === defaultKey) {
    return { sortBy: defaultKey, sortDir: sortDir ?? catalogSortDir(defaultKey, sortDir) };
  }
  if (!allowlist.sortKeys.includes(sortBy)) {
    throw new ListQueryError(`Unknown sort key: ${sortBy}`);
  }
  return {
    sortBy: sortBy as ApplicationsListSortKey,
    sortDir: catalogSortDir(sortBy, sortDir)
  };
}

function textArrayLiteral(values: string[]): SQL {
  return sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  )}]::text[]`;
}

function sourceTagsOverlap(tags: string[], negate: boolean): SQL {
  const overlap = sql`${application.sourceTags} && ${textArrayLiteral(tags)}`;
  return negate ? sql`not (${overlap})` : overlap;
}

function listingClosedExists(): SQL {
  return sql`exists (select 1 from ${jobPosting} where ${and(
    eq(jobPosting.id, application.postingId),
    isNotNull(jobPosting.closedAt)
  )})`;
}

function compileNumberCmp(
  column: typeof application.matchScore,
  cmp: ListQueryCmp
): SQL | undefined {
  const nums = cmp.args.map((arg) => Number(arg));
  switch (cmp.op) {
    case "eq":
      return eq(column, nums[0]!);
    case "neq":
      return ne(column, nums[0]!);
    case "gt":
      return gt(column, nums[0]!);
    case "lt":
      return lt(column, nums[0]!);
    case "gte":
      return gte(column, nums[0]!);
    case "lte":
      return lte(column, nums[0]!);
    case "between": {
      const min = nums[0];
      const max = nums[1];
      const parts: SQL[] = [];
      if (Number.isFinite(min)) parts.push(gte(column, min!));
      if (Number.isFinite(max)) parts.push(lte(column, max!));
      if (parts.length === 0) return undefined;
      return andAll(parts);
    }
    case "empty":
    case "iend":
    case "ilike":
    case "in":
    case "istart":
    case "nilike":
    case "not_empty":
    case "out":
    case "unrestricted":
      return undefined;
  }
}

function compileJobsCmp(cmp: ListQueryCmp): SQL {
  switch (cmp.field) {
    case "trackingStatus": {
      const [first] = cmp.args;
      if (cmp.op === "eq" && first !== undefined) {
        return eq(application.trackingStatus, first as "inbox" | "dismissed" | "tracked");
      }
      if (cmp.op === "in") {
        return inArray(
          application.trackingStatus,
          cmp.args as Array<"inbox" | "dismissed" | "tracked">
        );
      }
      break;
    }
    case "outcome": {
      if (cmp.op === "unrestricted") return sql`true`;
      if (cmp.op === "empty") return isNull(application.outcome);
      if (cmp.op === "not_empty") return isNotNull(application.outcome);
      const [first] = cmp.args;
      if (cmp.op === "eq" && first !== undefined) {
        return eq(application.outcome, first as "rejected" | "withdrawn" | "ghosted" | "accepted");
      }
      if (cmp.op === "in") {
        return inArray(
          application.outcome,
          cmp.args as Array<"rejected" | "withdrawn" | "ghosted" | "accepted">
        );
      }
      if (cmp.op === "out") {
        // NULL is not IN (...) in SQL; keep open jobs in is_not_any_of.
        const outSql = or(
          isNull(application.outcome),
          notInArray(
            application.outcome,
            cmp.args as Array<"rejected" | "withdrawn" | "ghosted" | "accepted">
          )
        );
        if (!outSql) break;
        return outSql;
      }
      break;
    }
    case "stage": {
      const [first] = cmp.args;
      if (cmp.op === "eq" && first !== undefined) {
        return eq(
          application.stage,
          first as "saved" | "applied" | "screening" | "interview" | "offer"
        );
      }
      if (cmp.op === "neq" && first !== undefined) {
        return ne(
          application.stage,
          first as "saved" | "applied" | "screening" | "interview" | "offer"
        );
      }
      if (cmp.op === "in") {
        return inArray(
          application.stage,
          cmp.args as Array<"saved" | "applied" | "screening" | "interview" | "offer">
        );
      }
      if (cmp.op === "out") {
        return notInArray(
          application.stage,
          cmp.args as Array<"saved" | "applied" | "screening" | "interview" | "offer">
        );
      }
      break;
    }
    case "sourceTags":
      if (cmp.op === "in") return sourceTagsOverlap(cmp.args, false);
      if (cmp.op === "out") return sourceTagsOverlap(cmp.args, true);
      break;
    case "listingClosed": {
      const value = cmp.args[0] === "true";
      const closed = cmp.op === "neq" ? !value : value;
      const existsSql = listingClosedExists();
      return closed ? existsSql : not(existsSql);
    }
    case "matchScore": {
      const sqlCmp = compileNumberCmp(application.matchScore, cmp);
      if (sqlCmp) return sqlCmp;
      break;
    }
    default:
      break;
  }
  throw new ListQueryError(`Unsupported jobs filter: ${cmp.field} ${cmp.op}`);
}

function compileJobs(
  input: CompileListQueryInput & { resource: "new-jobs" | "tracked-jobs" }
): CompiledListQuery<ApplicationsListSortKey> {
  if (input.board && input.resource !== "tracked-jobs") {
    throw new ListQueryError("Board compile is only valid for tracked jobs");
  }
  const filter = resolveJobsFilter(input.resource, input.filter);
  const ast = parseRsql(filter, input.resource);
  const chipAst = input.board ? stripOutcomeLeaves(ast) : ast;
  const where = andAll([
    jobsPartition(input.resource),
    input.board ? isNull(application.outcome) : undefined,
    compileJobsQ(input.q),
    chipAst ? compileAst(chipAst, compileJobsCmp) : undefined
  ]);
  return {
    where,
    ...compileJobsSort(input.resource, input.sortBy, input.sortDir)
  };
}

function compileResource<K extends string>(
  resource: ListQueryResource,
  input: CompileListQueryInput,
  compileQSql: (q: string | undefined) => SQL | undefined,
  compileCmp: (cmp: ListQueryCmp) => SQL,
  sort: { sortBy: K; sortDir: "asc" | "desc" }
): CompiledListQuery<K> {
  const filter = input.filter?.trim();
  const ast = filter ? parseRsql(filter, resource) : undefined;
  const where = andAll([compileQSql(input.q), ast ? compileAst(ast, compileCmp) : undefined]);
  return { where, ...sort };
}

export function compileListQuery(
  input: CompileListQueryInput & { resource: "skills" }
): CompiledListQuery<SkillsListSortKey>;
export function compileListQuery(
  input: CompileListQueryInput & { resource: "experiences" }
): CompiledListQuery<ExperiencesListSortKey>;
export function compileListQuery(
  input: CompileListQueryInput & { resource: "projects" }
): CompiledListQuery<ProjectsListSortKey>;
export function compileListQuery(
  input: CompileListQueryInput & { resource: "resumes" }
): CompiledListQuery<ResumesListSortKey>;
export function compileListQuery(
  input: CompileListQueryInput & { resource: "new-jobs" | "tracked-jobs" }
): CompiledListQuery<ApplicationsListSortKey>;
export function compileListQuery(input: CompileListQueryInput): CompiledListQuery;
export function compileListQuery(input: CompileListQueryInput): CompiledListQuery {
  switch (input.resource) {
    case "skills":
      return compileResource(
        "skills",
        input,
        compileSkillsQ,
        compileSkillsCmp,
        compileCatalogSort("skills", input.sortBy, input.sortDir, "sortOrder")
      );
    case "experiences":
      return compileResource(
        "experiences",
        input,
        compileExperiencesQ,
        compileExperiencesCmp,
        compileCatalogSort("experiences", input.sortBy, input.sortDir, "sortOrder")
      );
    case "projects":
      return compileResource(
        "projects",
        input,
        compileProjectsQ,
        compileProjectsCmp,
        compileCatalogSort("projects", input.sortBy, input.sortDir, "sortOrder")
      );
    case "resumes":
      return compileResource(
        "resumes",
        input,
        compileResumesQ,
        compileResumesCmp,
        compileResumesSort(input.sortBy, input.sortDir)
      );
    case "new-jobs":
    case "tracked-jobs":
      return compileJobs({ ...input, resource: input.resource });
  }
}
