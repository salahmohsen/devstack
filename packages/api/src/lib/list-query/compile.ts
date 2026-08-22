import {
  and,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
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
import { projectStack, stack } from "@tsu-stack/db/schema";

export const SKILLS_LIST_SORT_KEYS = ["sortOrder", "name", "projectCount", "updatedAt"] as const;
export type SkillsListSortKey = (typeof SKILLS_LIST_SORT_KEYS)[number];

export type CompiledListQuery = {
  where?: SQL;
  sortBy: SkillsListSortKey;
  sortDir: "asc" | "desc";
};

export type CompileListQueryInput = {
  resource: ListQueryResource;
  q?: string;
  filter?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

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

function stackProjectsExist(projectIds: string[], negate: boolean): SQL {
  const existsSql = sql`exists (select 1 from ${projectStack} where ${and(
    eq(projectStack.stackId, stack.id),
    inArray(projectStack.projectId, projectIds)
  )})`;
  return negate ? not(existsSql) : existsSql;
}

function compileSkillsQ(q: string | undefined): SQL | undefined {
  const trimmed = q?.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  // jsonb_array_elements_text is set-returning — wrap in EXISTS so rows are not duplicated.
  return or(
    ilike(stack.name, pattern),
    sql`exists (select 1 from jsonb_array_elements_text(${stack.alternativeNames}) as alias(name) where alias.name ilike ${pattern})`
  );
}

function compileSkillsCmp(cmp: ListQueryCmp): SQL {
  switch (cmp.field) {
    case "includedInPortfolio": {
      const value = cmp.args[0] === "true";
      const included = cmp.op === "neq" ? !value : value;
      return included ? isNotNull(stack.portfolioEntryId) : isNull(stack.portfolioEntryId);
    }
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

function compileSkillsSort(
  sortBy?: string,
  sortDir?: "asc" | "desc"
): {
  sortBy: SkillsListSortKey;
  sortDir: "asc" | "desc";
} {
  const allowlist = getListQueryAllowlist("skills");
  if (!sortBy || sortBy === "sortOrder") {
    return { sortBy: "sortOrder", sortDir: sortDir ?? "asc" };
  }
  if (!allowlist.sortKeys.includes(sortBy)) {
    throw new ListQueryError(`Unknown sort key: ${sortBy}`);
  }
  const key = sortBy as Exclude<SkillsListSortKey, "sortOrder">;
  const defaultDir = key === "name" ? "asc" : "desc";
  return { sortBy: key, sortDir: sortDir ?? defaultDir };
}

export function compileListQuery(input: CompileListQueryInput): CompiledListQuery {
  if (input.resource !== "skills") {
    throw new Error(`List query compile is not implemented for ${input.resource}`);
  }

  const filter = input.filter?.trim();
  const ast = filter ? parseRsql(filter, "skills") : undefined;
  const where = andAll([
    compileSkillsQ(input.q),
    ast ? compileAst(ast, compileSkillsCmp) : undefined
  ]);
  const sort = compileSkillsSort(input.sortBy, input.sortDir);
  return { where, ...sort };
}
