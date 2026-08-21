import {
  ApplicationOutcomeSchema,
  ApplicationSourceTagSchema,
  ApplicationStageSchema
} from "#@/application/types";
import {
  LIST_QUERY_RESOURCES,
  ListQueryError,
  type ListQueryOp,
  type ListQueryResource
} from "#@/list-query/types";
import { STACK_TYPE_ORDER } from "#@/stack/stack-type";

export type ListQueryFieldKind =
  | "boolean"
  | "select"
  | "multiselect"
  | "number"
  | "text"
  | "emptyable";

export type ListQueryPartition = "catalog" | "new-jobs" | "tracked-jobs";

export type ListQueryFieldConfig = {
  kind: ListQueryFieldKind;
  ops: readonly ListQueryOp[];
  values?: readonly string[];
};

export type ListQueryAllowlist = {
  resource: ListQueryResource;
  partition: ListQueryPartition;
  fields: Record<string, ListQueryFieldConfig>;
  qColumns: readonly string[];
  sortKeys: readonly string[];
  requiredLeaf?: "trackingStatus" | "outcome";
};

const BOOLEAN_OPS = ["eq", "neq"] as const satisfies readonly ListQueryOp[];
const SELECT_OPS = ["eq", "neq", "in", "out"] as const satisfies readonly ListQueryOp[];
const MULTI_OPS = ["in", "out"] as const satisfies readonly ListQueryOp[];
const NUMBER_OPS = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "between"
] as const satisfies readonly ListQueryOp[];
const EMPTY_OPS = ["empty", "not_empty"] as const satisfies readonly ListQueryOp[];
const TRACKING_OPS = ["eq", "in"] as const satisfies readonly ListQueryOp[];
const OUTCOME_OPS = [
  "eq",
  "in",
  "out",
  "empty",
  "not_empty",
  "unrestricted"
] as const satisfies readonly ListQueryOp[];

const BOOLEAN_VALUES = ["true", "false"] as const;
const NEW_JOBS_TRACKING_STATUS = ["inbox", "dismissed"] as const;

const booleanField: ListQueryFieldConfig = {
  kind: "boolean",
  ops: BOOLEAN_OPS,
  values: BOOLEAN_VALUES
};

const includedInPortfolio = booleanField;
const isFeatured = booleanField;
const listingClosed = booleanField;

const typeField: ListQueryFieldConfig = {
  kind: "select",
  ops: SELECT_OPS,
  values: STACK_TYPE_ORDER
};

const projectsField: ListQueryFieldConfig = { kind: "multiselect", ops: MULTI_OPS };
const stacksField: ListQueryFieldConfig = { kind: "multiselect", ops: MULTI_OPS };
const tiedToJobField: ListQueryFieldConfig = { kind: "emptyable", ops: EMPTY_OPS };

const trackingStatusField: ListQueryFieldConfig = {
  kind: "select",
  ops: TRACKING_OPS,
  values: NEW_JOBS_TRACKING_STATUS
};

const outcomeField: ListQueryFieldConfig = {
  kind: "select",
  ops: OUTCOME_OPS,
  values: ApplicationOutcomeSchema.options
};

const stageField: ListQueryFieldConfig = {
  kind: "select",
  ops: SELECT_OPS,
  values: ApplicationStageSchema.options
};

const sourceTagsField: ListQueryFieldConfig = {
  kind: "multiselect",
  ops: MULTI_OPS,
  values: ApplicationSourceTagSchema.options
};

const matchScoreField: ListQueryFieldConfig = { kind: "number", ops: NUMBER_OPS };

export const LIST_QUERY_ALLOWLISTS: Record<ListQueryResource, ListQueryAllowlist> = {
  experiences: {
    resource: "experiences",
    partition: "catalog",
    fields: { includedInPortfolio },
    qColumns: ["title", "organization"],
    sortKeys: ["fromDate", "title", "updatedAt"]
  },
  projects: {
    resource: "projects",
    partition: "catalog",
    fields: { includedInPortfolio, stacks: stacksField },
    qColumns: ["title"],
    sortKeys: ["year", "title", "updatedAt"]
  },
  skills: {
    resource: "skills",
    partition: "catalog",
    fields: {
      type: typeField,
      includedInPortfolio,
      isFeatured,
      projects: projectsField
    },
    qColumns: ["name", "alternativeNames"],
    sortKeys: ["name", "projectCount", "updatedAt"]
  },
  resumes: {
    resource: "resumes",
    partition: "catalog",
    fields: { tiedToJob: tiedToJobField },
    qColumns: ["filename", "linkedJobTitle", "linkedJobCompany"],
    sortKeys: ["updatedAt", "createdAt"]
  },
  "new-jobs": {
    resource: "new-jobs",
    partition: "new-jobs",
    fields: {
      trackingStatus: trackingStatusField,
      sourceTags: sourceTagsField,
      listingClosed,
      matchScore: matchScoreField
    },
    qColumns: ["title", "company"],
    sortKeys: ["matchScore", "updatedAt", "company"],
    requiredLeaf: "trackingStatus"
  },
  "tracked-jobs": {
    resource: "tracked-jobs",
    partition: "tracked-jobs",
    fields: {
      outcome: outcomeField,
      stage: stageField,
      sourceTags: sourceTagsField,
      matchScore: matchScoreField
    },
    qColumns: ["title", "company"],
    sortKeys: ["updatedAt", "stage", "matchScore", "company"],
    requiredLeaf: "outcome"
  }
};

export function getListQueryAllowlist(resource: ListQueryResource): ListQueryAllowlist {
  const allowlist = LIST_QUERY_ALLOWLISTS[resource];
  if (!allowlist) {
    throw new ListQueryError(`Unknown list query resource: ${resource}`);
  }
  return allowlist;
}

export function getListQueryField(
  field: string,
  resource?: ListQueryResource
): ListQueryFieldConfig | undefined {
  if (resource) return LIST_QUERY_ALLOWLISTS[resource].fields[field];
  for (const resourceId of LIST_QUERY_RESOURCES) {
    const config = LIST_QUERY_ALLOWLISTS[resourceId].fields[field];
    if (config) return config;
  }
  return undefined;
}
