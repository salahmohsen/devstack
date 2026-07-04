import { and, eq, type SQL, sql } from "drizzle-orm";

import { type PortfolioEntryType } from "@tsu-stack/core/portfolio";

export type PortfolioEntityType = PortfolioEntryType;

export const PORTFOLIO_ENTITY_TYPES: readonly PortfolioEntityType[] = [
  "experience",
  "project",
  "stack",
  "contact"
] as const;

export function isEntityType(value: string): value is PortfolioEntityType {
  return (PORTFOLIO_ENTITY_TYPES as readonly string[]).includes(value);
}

const ENTITY_COLUMNS: Record<PortfolioEntityType, { title: string; year?: string }> = {
  experience: { title: "title" },
  project: { title: "title", year: "year" },
  stack: { title: "name" },
  contact: { title: "type" }
};

type Token =
  | { kind: "ident"; value: string }
  | { kind: "string"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "semicolon" };

export class RsqlFilterError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "RsqlFilterError";
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if (ch === ";") {
      tokens.push({ kind: "semicolon" });
      i++;
      continue;
    }
    if (ch === "=" || ch === "!" || ch === "<" || ch === ">" || ch === "~") {
      let op = ch;
      if (input[i + 1] === "=") {
        op += "=";
        i++;
      }
      tokens.push({ kind: "op", value: op });
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let value = "";
      while (j < input.length && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < input.length) {
          value += input[j + 1];
          j += 2;
          continue;
        }
        value += input[j];
        j++;
      }
      if (j >= input.length) {
        throw new RsqlFilterError("Unterminated string literal");
      }
      tokens.push({ kind: "string", value });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < input.length && !" (),;!=<>'\"".includes(input[j])) {
      j++;
    }
    if (j === i) {
      throw new RsqlFilterError(`Unexpected character at position ${i}: ${ch}`);
    }
    tokens.push({ kind: "ident", value: input.slice(i, j) });
    i = j;
  }
  return tokens;
}

type Ast =
  | { type: "comparison"; selector: string; op: string; args: string[] }
  | { type: "and"; left: Ast; right: Ast }
  | { type: "or"; left: Ast; right: Ast };

export type { Ast };

class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Ast {
    const expr = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new RsqlFilterError("Unexpected token at end of input");
    }
    return expr;
  }

  private parseOr(): Ast {
    let left = this.parseAnd();
    while (this.peekKeyword("or")) {
      this.pos++;
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }
    return left;
  }

  private parseAnd(): Ast {
    let left = this.parseGroup();
    while (this.pos < this.tokens.length && !this.peekKeyword("or") && !this.peekPunct(")")) {
      if (this.peekPunct(";")) {
        this.pos++;
      }
      const right = this.parseGroup();
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseGroup(): Ast {
    if (this.peekPunct("(")) {
      this.pos++;
      const expr = this.parseOr();
      if (!this.peekPunct(")")) {
        throw new RsqlFilterError("Expected ')'");
      }
      this.pos++;
      return expr;
    }
    return this.parseComparison();
  }

  private parseComparison(): Ast {
    const selector = this.consumeIdent();
    const op = this.consumeOp();
    const args: string[] = [];
    args.push(this.consumeValue());
    while (this.peekPunct(",")) {
      this.pos++;
      args.push(this.consumeValue());
    }
    return { type: "comparison", selector, op, args };
  }

  private consumeIdent(): string {
    const t = this.tokens[this.pos];
    if (!t || t.kind !== "ident") {
      throw new RsqlFilterError("Expected identifier");
    }
    this.pos++;
    return t.value;
  }

  private consumeOp(): string {
    const t = this.tokens[this.pos];
    if (!t || t.kind !== "op") {
      throw new RsqlFilterError("Expected comparison operator");
    }
    this.pos++;
    return t.value;
  }

  private consumeValue(): string {
    const t = this.tokens[this.pos];
    if (!t || (t.kind !== "string" && t.kind !== "ident")) {
      throw new RsqlFilterError("Expected value");
    }
    this.pos++;
    return t.value;
  }

  private peekKeyword(kw: string): boolean {
    const t = this.tokens[this.pos];
    return t?.kind === "ident" && t.value.toLowerCase() === kw;
  }

  private peekPunct(p: string): boolean {
    if (p === "(" && this.tokens[this.pos]?.kind === "lparen") return true;
    if (p === ")" && this.tokens[this.pos]?.kind === "rparen") return true;
    if (p === "," && this.tokens[this.pos]?.kind === "comma") return true;
    if (p === ";" && this.tokens[this.pos]?.kind === "semicolon") return true;
    return false;
  }
}

export function parseRsql(input: string): Ast {
  return new Parser(tokenize(input)).parse();
}

function applySelector(
  type: PortfolioEntityType,
  selector: string,
  builder: (col: SQL) => SQL
): SQL | undefined {
  const cols = ENTITY_COLUMNS[type];
  if (selector === "type") {
    return builder(sql`type`);
  }
  if (selector === "title" && "title" in cols) {
    return builder(sql.raw(cols.title));
  }
  if (selector === "name" && type === "stack") {
    return builder(sql.raw(cols.title));
  }
  if (selector === "year" && cols.year) {
    return builder(sql.raw(cols.year));
  }
  if (selector === "id") {
    return builder(sql`id`);
  }
  if (selector === "sortOrder") {
    return builder(sql`sort_order`);
  }
  return undefined;
}

function comparisonToSql(
  type: PortfolioEntityType,
  c: { selector: string; op: string; args: string[] }
): SQL | undefined {
  const build = (col: SQL) => {
    const [first, ...rest] = c.args;
    switch (c.op) {
      case "==":
      case "=":
        return eq(col, first);
      case "!=":
        return sql`${col} != ${first}`;
      case ">=":
        return sql`${col} >= ${Number(first)}`;
      case ">":
        return sql`${col} > ${Number(first)}`;
      case "<=":
        return sql`${col} <= ${Number(first)}`;
      case "<":
        return sql`${col} < ${Number(first)}`;
      case "=in=":
        return sql`${col} IN (${sql.join(
          [first, ...rest].map((v) => sql`${v}`),
          sql`, `
        )})`;
      case "=out=":
        return sql`${col} NOT IN (${sql.join(
          [first, ...rest].map((v) => sql`${v}`),
          sql`, `
        )})`;
      case "=like=":
      case "=ilike=":
        return sql`${col} ILIKE ${first}`;
      default:
        return sql`1=0`;
    }
  };
  return applySelector(type, c.selector, build);
}

function astToSql(type: PortfolioEntityType, ast: Ast): SQL | undefined {
  if (ast.type === "comparison") {
    return comparisonToSql(type, ast);
  }
  const left = astToSql(type, ast.left);
  const right = astToSql(type, ast.right);
  if (!left && !right) return undefined;
  if (!left) return right;
  if (!right) return left;
  return ast.type === "and" ? and(left, right) : sql`(${left}) OR (${right})`;
}

export function buildPortfolioEntityFilter(
  filter: string,
  type: PortfolioEntityType
): SQL | undefined {
  const ast = parseRsql(filter);
  const where = astToSql(type, ast);
  return where ?? undefined;
}
