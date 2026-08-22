import { getListQueryField } from "#@/list-query/allowlists";
import {
  collectListQueryCmps,
  type FilterLeaf,
  type ListQueryAst,
  type ListQueryCmp
} from "#@/list-query/types";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asNumberRange(value: unknown): { min: number | null; max: number | null } {
  if (typeof value === "object" && value !== null) {
    const candidate = value as { min?: unknown; max?: unknown };
    return { min: asFiniteNumber(candidate.min), max: asFiniteNumber(candidate.max) };
  }
  return { min: null, max: null };
}

function scalarArg(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value);
}

export function isCompleteFilterLeaf(leaf: FilterLeaf): boolean {
  switch (leaf.operator) {
    case "is_empty":
    case "is_not_empty":
      return true;
    case "is_any_of":
    case "is_not_any_of":
    case "includes_all":
      return asStringArray(leaf.value).length > 0;
    case "between": {
      const range = asNumberRange(leaf.value);
      return range.min !== null || range.max !== null;
    }
    case "contains":
    case "not_contains":
    case "starts_with":
    case "ends_with":
      return typeof leaf.value === "string" && leaf.value.length > 0;
    case "is":
    case "is_not":
    case "eq":
    case "neq":
    case "gt":
    case "lt":
      return leaf.value !== null && leaf.value !== undefined && leaf.value !== "";
    default:
      return false;
  }
}

function leafToCmp(leaf: FilterLeaf): ListQueryCmp | null {
  if (!isCompleteFilterLeaf(leaf)) return null;
  switch (leaf.operator) {
    case "is":
    case "eq":
      return { type: "cmp", field: leaf.field, op: "eq", args: [scalarArg(leaf.value)] };
    case "is_not":
    case "neq":
      return { type: "cmp", field: leaf.field, op: "neq", args: [scalarArg(leaf.value)] };
    case "is_any_of":
      return { type: "cmp", field: leaf.field, op: "in", args: asStringArray(leaf.value) };
    case "is_not_any_of":
      return { type: "cmp", field: leaf.field, op: "out", args: asStringArray(leaf.value) };
    case "contains":
      return { type: "cmp", field: leaf.field, op: "ilike", args: [String(leaf.value)] };
    case "not_contains":
      return { type: "cmp", field: leaf.field, op: "nilike", args: [String(leaf.value)] };
    case "starts_with":
      return { type: "cmp", field: leaf.field, op: "istart", args: [String(leaf.value)] };
    case "ends_with":
      return { type: "cmp", field: leaf.field, op: "iend", args: [String(leaf.value)] };
    case "gt":
      return { type: "cmp", field: leaf.field, op: "gt", args: [scalarArg(leaf.value)] };
    case "lt":
      return { type: "cmp", field: leaf.field, op: "lt", args: [scalarArg(leaf.value)] };
    case "between": {
      const range = asNumberRange(leaf.value);
      if (range.min !== null && range.max !== null) {
        return {
          type: "cmp",
          field: leaf.field,
          op: "between",
          args: [String(range.min), String(range.max)]
        };
      }
      if (range.min !== null) {
        return { type: "cmp", field: leaf.field, op: "gte", args: [String(range.min)] };
      }
      if (range.max !== null) {
        return { type: "cmp", field: leaf.field, op: "lte", args: [String(range.max)] };
      }
      return null;
    }
    case "is_empty":
      return { type: "cmp", field: leaf.field, op: "empty", args: [] };
    case "is_not_empty":
      return { type: "cmp", field: leaf.field, op: "not_empty", args: [] };
    default:
      return null;
  }
}

export function filterValuesToAst(leaves: FilterLeaf[]): ListQueryAst {
  return {
    type: "and",
    children: leaves.flatMap((leaf) => {
      const cmp = leafToCmp(leaf);
      return cmp ? [cmp] : [];
    })
  };
}

function leafValue(field: string, arg: string): unknown {
  const kind = getListQueryField(field)?.kind;
  if (kind === "number") return Number(arg);
  return arg;
}

function cmpToLeaf(cmp: ListQueryCmp): FilterLeaf | null {
  if (cmp.op === "unrestricted") return null;
  const kind = getListQueryField(cmp.field)?.kind;
  const numberEq = kind === "number";
  switch (cmp.op) {
    case "eq":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: numberEq ? "eq" : "is",
        value: leafValue(cmp.field, cmp.args[0] ?? "")
      };
    case "neq":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: numberEq ? "neq" : "is_not",
        value: leafValue(cmp.field, cmp.args[0] ?? "")
      };
    case "in":
      return { id: cmp.field, field: cmp.field, operator: "is_any_of", value: cmp.args };
    case "out":
      return { id: cmp.field, field: cmp.field, operator: "is_not_any_of", value: cmp.args };
    case "ilike":
      return { id: cmp.field, field: cmp.field, operator: "contains", value: cmp.args[0] };
    case "nilike":
      return { id: cmp.field, field: cmp.field, operator: "not_contains", value: cmp.args[0] };
    case "istart":
      return { id: cmp.field, field: cmp.field, operator: "starts_with", value: cmp.args[0] };
    case "iend":
      return { id: cmp.field, field: cmp.field, operator: "ends_with", value: cmp.args[0] };
    case "gt":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: "gt",
        value: leafValue(cmp.field, cmp.args[0] ?? "")
      };
    case "lt":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: "lt",
        value: leafValue(cmp.field, cmp.args[0] ?? "")
      };
    case "gte":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: "between",
        value: { min: Number(cmp.args[0]), max: null }
      };
    case "lte":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: "between",
        value: { min: null, max: Number(cmp.args[0]) }
      };
    case "between":
      return {
        id: cmp.field,
        field: cmp.field,
        operator: "between",
        value: { min: Number(cmp.args[0]), max: Number(cmp.args[1]) }
      };
    case "empty":
      return { id: cmp.field, field: cmp.field, operator: "is_empty", value: null };
    case "not_empty":
      return { id: cmp.field, field: cmp.field, operator: "is_not_empty", value: null };
    default:
      return null;
  }
}

export function astToFilterValues(ast: ListQueryAst): FilterLeaf[] {
  return collectListQueryCmps(ast).flatMap((cmp) => {
    const leaf = cmpToLeaf(cmp);
    return leaf ? [leaf] : [];
  });
}
