import { z } from "zod";

export type ListQueryCombinator = "and" | "or";

export type ListQueryOp =
  | "eq"
  | "neq"
  | "in"
  | "out"
  | "ilike"
  | "nilike"
  | "istart"
  | "iend"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between"
  | "empty"
  | "not_empty"
  | "unrestricted";

export type ListQueryAst =
  | { type: "and" | "or"; children: ListQueryAst[] }
  | { type: "cmp"; field: string; op: ListQueryOp; args: string[] };

export type ListQueryCmp = Extract<ListQueryAst, { type: "cmp" }>;

export type FilterLeaf = {
  id: string;
  field: string;
  operator: string;
  value: unknown;
};

export const ListQueryInputSchema = z.object({
  q: z.string().trim().max(200).optional(),
  filter: z.string().max(4000).optional(),
  sortBy: z.string().max(64).optional(),
  sortDir: z.enum(["asc", "desc"]).optional()
});
export type ListQueryInput = z.infer<typeof ListQueryInputSchema>;

export const LIST_QUERY_RESOURCES = [
  "experiences",
  "projects",
  "skills",
  "resumes",
  "new-jobs",
  "tracked-jobs"
] as const;
export type ListQueryResource = (typeof LIST_QUERY_RESOURCES)[number];

export class ListQueryError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ListQueryError";
  }
}

export function collectListQueryCmps(ast: ListQueryAst): ListQueryCmp[] {
  if (ast.type === "cmp") return [ast];
  return ast.children.flatMap(collectListQueryCmps);
}
