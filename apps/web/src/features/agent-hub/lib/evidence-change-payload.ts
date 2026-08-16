import { z } from "zod";

import {
  CreateExperienceInputSchema,
  CreateProjectInputSchema,
  StackCreateInputSchema,
  StackUpdateInputSchema,
  UpdateExperienceInputSchema,
  UpdateProjectInputSchema,
  type CreateExperienceInput,
  type CreateProjectInput,
  type EvidenceKind,
  type StackCreateInput,
  type StackUpdateInput,
  type UpdateExperienceInput,
  type UpdateProjectInput
} from "@tsu-stack/core";

export type EvidenceWrite =
  | { mode: "create"; kind: "project"; input: CreateProjectInput }
  | { mode: "update"; kind: "project"; id: string; data: UpdateProjectInput }
  | { mode: "create"; kind: "experience"; input: CreateExperienceInput }
  | { mode: "update"; kind: "experience"; id: string; data: UpdateExperienceInput }
  | { mode: "create"; kind: "stack"; input: StackCreateInput }
  | { mode: "update"; kind: "stack"; id: string; data: StackUpdateInput };

/** Merge current row + patch. Never pass `patch` alone into `evidenceGoalsReady` on edit. */
export function mergeEvidenceRecord(
  currentRow: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return currentRow ? { ...currentRow, ...patch } : { ...patch };
}

export function evidenceApprovalTitle(kind: EvidenceKind, id?: string): string {
  return id ? `Confirm ${kind} change` : `Confirm new ${kind}`;
}

export function rowToRecord(row: object | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row } as Record<string, unknown>;
}

/**
 * Experience dates must be `YYYY-MM-DD` or omitted. Invalid LLM values are
 * dropped (`undefined`) so Confirm does not fail schema validation.
 */
export function sanitizeExperienceDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = z.string().date().safeParse(trimmed);
  return parsed.success ? parsed.data : undefined;
}

export function resolveExperienceDate(merged: unknown, fallback?: unknown): string | null {
  const sanitized = sanitizeExperienceDate(merged);
  if (sanitized !== undefined) return sanitized;
  const fromFallback = sanitizeExperienceDate(fallback);
  if (fromFallback !== undefined) return fromFallback;
  return null;
}

export function buildEvidenceWrite(input: {
  kind: EvidenceKind;
  id?: string;
  record: Record<string, unknown>;
  patch: Record<string, unknown>;
  currentRow?: Record<string, unknown> | null;
}): EvidenceWrite | null {
  const { kind, id, record, patch, currentRow } = input;
  if (id) {
    if (kind === "project") {
      const data = buildUpdateProject(patch);
      return data ? { mode: "update", kind, id, data } : null;
    }
    if (kind === "experience") {
      const data = buildUpdateExperience(record, patch, currentRow);
      return data ? { mode: "update", kind, id, data } : null;
    }
    const data = buildUpdateStack(patch);
    return data ? { mode: "update", kind, id, data } : null;
  }

  if (kind === "project") {
    const created = buildCreateProject(record);
    return created ? { mode: "create", kind, input: created } : null;
  }
  if (kind === "experience") {
    const created = buildCreateExperience(record, currentRow);
    return created ? { mode: "create", kind, input: created } : null;
  }
  const created = buildCreateStack(record);
  return created ? { mode: "create", kind, input: created } : null;
}

function buildCreateProject(record: Record<string, unknown>): CreateProjectInput | null {
  const title = asNonEmptyString(record.title);
  const year = asYear(record.year);
  const summary = asString(record.summary);
  if (!title || year === undefined || summary === undefined) return null;

  const parsed = CreateProjectInputSchema.safeParse({
    title,
    year,
    summary,
    description: asString(record.description) ?? "",
    ...optionalField("repos", asUrlList(record.repos)),
    ...optionalField("demoUrl", asUrlOrNull(record.demoUrl)),
    ...optionalField("includedInPortfolio", asBoolean(record.includedInPortfolio)),
    ...optionalField("isPresent", asBoolean(record.isPresent)),
    ...optionalField("experienceId", asNullableString(record.experienceId))
  });
  return parsed.success ? parsed.data : null;
}

function buildUpdateProject(patch: Record<string, unknown>): UpdateProjectInput | null {
  const data: Record<string, unknown> = {};
  if ("title" in patch) {
    const title = asNonEmptyString(patch.title);
    if (title) data.title = title;
  }
  if ("year" in patch) {
    const year = asYear(patch.year);
    if (year !== undefined) data.year = year;
  }
  if ("summary" in patch && typeof patch.summary === "string") data.summary = patch.summary;
  if ("description" in patch && typeof patch.description === "string") {
    data.description = patch.description;
  }
  if ("repos" in patch) {
    const repos = asUrlList(patch.repos);
    if (repos && repos.length > 0) data.repos = repos;
  }
  if ("demoUrl" in patch) {
    const demoUrl = asUrlOrNull(patch.demoUrl);
    if (demoUrl !== undefined) data.demoUrl = demoUrl;
  }
  if (typeof patch.includedInPortfolio === "boolean") {
    data.includedInPortfolio = patch.includedInPortfolio;
  }
  if (typeof patch.isPresent === "boolean") data.isPresent = patch.isPresent;
  if ("experienceId" in patch) {
    const experienceId = asNullableString(patch.experienceId);
    if (experienceId !== undefined) data.experienceId = experienceId;
  }

  const parsed = UpdateProjectInputSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

function buildCreateExperience(
  record: Record<string, unknown>,
  currentRow?: Record<string, unknown> | null
): CreateExperienceInput | null {
  const title = asNonEmptyString(record.title);
  const organization = asNonEmptyString(record.organization);
  const description = asString(record.description);
  if (!title || !organization || description === undefined) return null;

  const parsed = CreateExperienceInputSchema.safeParse({
    title,
    organization,
    description,
    fromDate: resolveExperienceDate(record.fromDate, currentRow?.fromDate),
    toDate: resolveExperienceDate(record.toDate, currentRow?.toDate),
    ...optionalField("isPresent", asBoolean(record.isPresent)),
    ...optionalField("includedInPortfolio", asBoolean(record.includedInPortfolio))
  });
  return parsed.success ? parsed.data : null;
}

function buildUpdateExperience(
  record: Record<string, unknown>,
  patch: Record<string, unknown>,
  currentRow?: Record<string, unknown> | null
): UpdateExperienceInput | null {
  const description = asString(record.description);
  if (description === undefined) return null;

  const data: Record<string, unknown> = {
    description,
    fromDate: resolveExperienceDate(record.fromDate, currentRow?.fromDate),
    toDate: resolveExperienceDate(record.toDate, currentRow?.toDate)
  };
  if ("title" in patch) {
    const title = asNonEmptyString(patch.title);
    if (title) data.title = title;
  }
  if ("organization" in patch) {
    const organization = asNonEmptyString(patch.organization);
    if (organization) data.organization = organization;
  }
  if (typeof patch.isPresent === "boolean") data.isPresent = patch.isPresent;
  if (typeof patch.includedInPortfolio === "boolean") {
    data.includedInPortfolio = patch.includedInPortfolio;
  }

  const parsed = UpdateExperienceInputSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

function buildCreateStack(record: Record<string, unknown>): StackCreateInput | null {
  const name = asNonEmptyString(record.name);
  if (!name) return null;

  const parsed = StackCreateInputSchema.safeParse({
    name,
    ...optionalField("description", asNullableString(record.description)),
    ...optionalField("type", asNullableString(record.type)),
    ...optionalField("includedInPortfolio", asBoolean(record.includedInPortfolio)),
    ...optionalField("isFeatured", asBoolean(record.isFeatured))
  });
  return parsed.success ? parsed.data : null;
}

function buildUpdateStack(patch: Record<string, unknown>): StackUpdateInput | null {
  const data: Record<string, unknown> = {};
  if ("name" in patch) {
    const name = asNonEmptyString(patch.name);
    if (name) data.name = name;
  }
  if ("description" in patch) {
    const description = asNullableString(patch.description);
    if (description !== undefined) data.description = description;
  }
  if ("type" in patch) {
    const type = asNullableString(patch.type);
    if (type !== undefined) data.type = type;
  }
  if (typeof patch.includedInPortfolio === "boolean") {
    data.includedInPortfolio = patch.includedInPortfolio;
  }
  if (typeof patch.isFeatured === "boolean") data.isFeatured = patch.isFeatured;

  const parsed = StackUpdateInputSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function asYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return undefined;
}

function asUrlList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return items.filter((item): item is string => typeof item === "string" && URL.canParse(item));
}

function asUrlOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return URL.canParse(trimmed) ? trimmed : undefined;
}
