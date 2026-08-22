import { ORPCError } from "@orpc/server";

import {
  APPLICATION_TRACKING_STATUS_LABELS,
  formatStackTypeLabel,
  ListQueryError,
  SEARCH_ENTITIES_PER_TYPE,
  SEARCH_ENTITY_TYPES,
  searchEntityHit,
  type SearchEntitiesInput,
  type SearchEntityHit,
  type SearchEntityType
} from "@tsu-stack/core";
import {
  applicationRepository,
  experienceRepository,
  projectRepository,
  resumeRepository,
  stackRepository
} from "@tsu-stack/db/repositories";

import { compileListQuery } from "#@/lib/list-query/compile";

/** Palette inbox_job is the full new-jobs partition, not the inbox URL seed. */
const INBOX_JOBS_FILTER = "trackingStatus=in=(inbox,dismissed)";
/** Palette tracked_job is all tracked rows, not the open-only URL seed. */
const TRACKED_JOBS_FILTER = "outcome=unrestricted=";

function compileOrThrow<T>(compile: () => T): T {
  try {
    return compile();
  } catch (error) {
    if (error instanceof ListQueryError) {
      throw new ORPCError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}

function wantsType(wanted: ReadonlySet<SearchEntityType>, type: SearchEntityType): boolean {
  return wanted.has(type);
}

async function searchExperiences(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() => compileListQuery({ resource: "experiences", q }));
  const page = await experienceRepository.findPageByUserId(userId, {
    cursor: null,
    limit: SEARCH_ENTITIES_PER_TYPE,
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir
  });
  return page.items.map((row) =>
    searchEntityHit({
      type: "experience",
      id: row.id,
      label: row.title,
      sublabel: row.organization
    })
  );
}

async function searchProjects(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() => compileListQuery({ resource: "projects", q }));
  const page = await projectRepository.findPageByUserId(userId, {
    cursor: null,
    limit: SEARCH_ENTITIES_PER_TYPE,
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir
  });
  return page.items.map((row) =>
    searchEntityHit({
      type: "project",
      id: row.id,
      label: row.title,
      sublabel: String(row.year)
    })
  );
}

async function searchStacks(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() => compileListQuery({ resource: "skills", q }));
  const page = await stackRepository.findPageByUserId(userId, {
    cursor: null,
    limit: SEARCH_ENTITIES_PER_TYPE,
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir
  });
  return page.items.map((row) =>
    searchEntityHit({
      type: "stack",
      id: row.id,
      label: row.name,
      sublabel: row.type ? formatStackTypeLabel(row.type) : null
    })
  );
}

async function searchResumes(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() => compileListQuery({ resource: "resumes", q }));
  const rows = await resumeRepository.findAllByUserId(userId, {
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir,
    limit: SEARCH_ENTITIES_PER_TYPE
  });
  return rows.map((row) =>
    searchEntityHit({
      type: "resume",
      id: row.id,
      label: row.filename,
      sublabel: row.default ? "Default" : null
    })
  );
}

async function searchInboxJobs(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() =>
    compileListQuery({
      resource: "new-jobs",
      q,
      filter: INBOX_JOBS_FILTER
    })
  );
  const page = await applicationRepository.findPageByUserId(userId, {
    cursor: null,
    limit: SEARCH_ENTITIES_PER_TYPE,
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir
  });
  return page.items.map((row) =>
    searchEntityHit({
      type: "inbox_job",
      id: row.id,
      label: row.title,
      sublabel:
        row.trackingStatus === "dismissed"
          ? `${row.companyName} · ${APPLICATION_TRACKING_STATUS_LABELS.dismissed}`
          : row.companyName
    })
  );
}

async function searchTrackedJobs(userId: string, q: string): Promise<SearchEntityHit[]> {
  const compiled = compileOrThrow(() =>
    compileListQuery({
      resource: "tracked-jobs",
      q,
      filter: TRACKED_JOBS_FILTER
    })
  );
  const page = await applicationRepository.findPageByUserId(userId, {
    cursor: null,
    limit: SEARCH_ENTITIES_PER_TYPE,
    where: compiled.where,
    sortBy: compiled.sortBy,
    sortDir: compiled.sortDir
  });
  return page.items.map((row) =>
    searchEntityHit({
      type: "tracked_job",
      id: row.id,
      label: row.title,
      sublabel: row.companyName
    })
  );
}

export async function searchEntitiesForUser(
  userId: string,
  input: SearchEntitiesInput
): Promise<SearchEntityHit[]> {
  const wanted = new Set(input.types ?? SEARCH_ENTITY_TYPES);
  const q = input.q;
  const tasks: Array<Promise<SearchEntityHit[]>> = [];
  if (wantsType(wanted, "experience")) tasks.push(searchExperiences(userId, q));
  if (wantsType(wanted, "project")) tasks.push(searchProjects(userId, q));
  if (wantsType(wanted, "stack")) tasks.push(searchStacks(userId, q));
  if (wantsType(wanted, "resume")) tasks.push(searchResumes(userId, q));
  if (wantsType(wanted, "inbox_job")) tasks.push(searchInboxJobs(userId, q));
  if (wantsType(wanted, "tracked_job")) tasks.push(searchTrackedJobs(userId, q));
  const groups = await Promise.all(tasks);
  return groups.flat();
}
