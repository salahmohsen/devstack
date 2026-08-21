import { getListQueryAllowlist } from "#@/list-query/allowlists";
import {
  collectListQueryCmps,
  ListQueryError,
  type ListQueryAst,
  type ListQueryCmp,
  type ListQueryOp,
  type ListQueryResource
} from "#@/list-query/types";

type Token =
  | { kind: "ident"; value: string }
  | { kind: "string"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "semicolon" };

const OP_BY_TOKEN: Record<string, ListQueryOp> = {
  "==": "eq",
  "!=": "neq",
  "=in=": "in",
  "=out=": "out",
  "=ilike=": "ilike",
  "=nilike=": "nilike",
  "=istart=": "istart",
  "=iend=": "iend",
  ">": "gt",
  "<": "lt",
  ">=": "gte",
  "<=": "lte",
  "=between=": "between",
  "=unrestricted=": "unrestricted"
};

const TOKEN_BY_OP: Record<ListQueryOp, string> = {
  eq: "==",
  neq: "!=",
  in: "=in=",
  out: "=out=",
  ilike: "=ilike=",
  nilike: "=nilike=",
  istart: "=istart=",
  iend: "=iend=",
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  between: "=between=",
  empty: "==",
  not_empty: "!=",
  unrestricted: "=unrestricted="
};

const BARE_VALUE = /^[A-Za-z0-9_.-]+$/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
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
        throw new ListQueryError("Unterminated string in list filter");
      }
      tokens.push({ kind: "string", value });
      i = j + 1;
      continue;
    }
    if (ch === "=") {
      const rest = input.slice(i + 1);
      const identMatch = rest.match(/^[A-Za-z][A-Za-z0-9_]*/);
      if (identMatch && rest[identMatch[0].length] === "=") {
        const op = `=${identMatch[0]}=`;
        tokens.push({ kind: "op", value: op });
        i += op.length;
        continue;
      }
      if (input[i + 1] === "=") {
        tokens.push({ kind: "op", value: "==" });
        i += 2;
        continue;
      }
      throw new ListQueryError(`Unexpected '=' in list filter`);
    }
    if (ch === "!" && input[i + 1] === "=") {
      tokens.push({ kind: "op", value: "!=" });
      i += 2;
      continue;
    }
    if (ch === ">" || ch === "<") {
      const op = input[i + 1] === "=" ? `${ch}=` : ch;
      tokens.push({ kind: "op", value: op });
      i += op.length;
      continue;
    }
    if (isAtomChar(ch)) {
      let j = i + 1;
      while (j < input.length && isAtomChar(input[j]!)) j++;
      tokens.push({ kind: "ident", value: input.slice(i, j) });
      i = j;
      continue;
    }
    throw new ListQueryError(`Unexpected character in list filter: ${ch}`);
  }
  return tokens;
}

function isAtomChar(ch: string): boolean {
  return /[A-Za-z0-9_.-]/.test(ch);
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ListQueryAst {
    if (this.tokens.length === 0) {
      return { type: "and", children: [] };
    }
    const expr = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new ListQueryError("Unexpected token at end of list filter");
    }
    return expr;
  }

  private parseOr(): ListQueryAst {
    const children = [this.parseAnd()];
    while (this.peekKeyword("or")) {
      this.pos++;
      children.push(this.parseAnd());
    }
    if (children.length === 1) return children[0]!;
    return { type: "or", children };
  }

  private parseAnd(): ListQueryAst {
    const children = [this.parseGroup()];
    while (this.pos < this.tokens.length && !this.peekKeyword("or") && !this.peekPunct(")")) {
      if (this.peekPunct(";")) {
        this.pos++;
      } else if (this.peekKeyword("and")) {
        this.pos++;
      } else {
        break;
      }
      children.push(this.parseGroup());
    }
    if (children.length === 1) return children[0]!;
    return { type: "and", children };
  }

  private parseGroup(): ListQueryAst {
    if (this.peekPunct("(")) {
      this.pos++;
      const expr = this.parseOr();
      if (!this.peekPunct(")")) {
        throw new ListQueryError("Expected ')' in list filter");
      }
      this.pos++;
      return expr;
    }
    return this.parseComparison();
  }

  private parseComparison(): ListQueryCmp {
    const field = this.consumeIdent();
    const token = this.consumeOp();
    const mapped = OP_BY_TOKEN[token];
    if (!mapped) {
      throw new ListQueryError(`Unknown list filter operator: ${token}`);
    }
    if (mapped === "unrestricted") {
      return { type: "cmp", field, op: "unrestricted", args: [] };
    }
    const args = this.parseArgs(mapped);
    if (
      (mapped === "eq" || mapped === "neq") &&
      args.length === 1 &&
      args[0]!.toLowerCase() === "null"
    ) {
      return {
        type: "cmp",
        field,
        op: mapped === "eq" ? "empty" : "not_empty",
        args: []
      };
    }
    return { type: "cmp", field, op: mapped, args };
  }

  private parseArgs(op: ListQueryOp): string[] {
    if (this.peekPunct("(")) {
      this.pos++;
      if (this.peekPunct(")")) {
        this.pos++;
        return this.requireArity(op, []);
      }
      const args = [this.consumeValue()];
      while (this.peekPunct(",")) {
        this.pos++;
        args.push(this.consumeValue());
      }
      if (!this.peekPunct(")")) {
        throw new ListQueryError("Expected ')' after list filter arguments");
      }
      this.pos++;
      return this.requireArity(op, args);
    }
    return this.requireArity(op, [this.consumeValue()]);
  }

  private requireArity(op: ListQueryOp, args: string[]): string[] {
    if (op === "between" && args.length !== 2) {
      throw new ListQueryError("between requires two arguments");
    }
    if ((op === "in" || op === "out") && args.length === 0) {
      throw new ListQueryError(`${op} requires at least one argument`);
    }
    if (
      op !== "between" &&
      op !== "in" &&
      op !== "out" &&
      op !== "unrestricted" &&
      op !== "empty" &&
      op !== "not_empty" &&
      args.length !== 1
    ) {
      throw new ListQueryError(`Operator ${op} requires one argument`);
    }
    return args;
  }

  private consumeIdent(): string {
    const token = this.tokens[this.pos];
    if (!token || token.kind !== "ident") {
      throw new ListQueryError("Expected field name in list filter");
    }
    this.pos++;
    return token.value;
  }

  private consumeOp(): string {
    const token = this.tokens[this.pos];
    if (!token || token.kind !== "op") {
      throw new ListQueryError("Expected comparison operator in list filter");
    }
    this.pos++;
    return token.value;
  }

  private consumeValue(): string {
    const token = this.tokens[this.pos];
    if (!token || (token.kind !== "ident" && token.kind !== "string")) {
      throw new ListQueryError("Expected value in list filter");
    }
    this.pos++;
    return token.value;
  }

  private peekKeyword(keyword: string): boolean {
    const token = this.tokens[this.pos];
    return token?.kind === "ident" && token.value.toLowerCase() === keyword;
  }

  private peekPunct(symbol: ")" | "(" | "," | ";"): boolean {
    const token = this.tokens[this.pos];
    if (symbol === "(") return token?.kind === "lparen";
    if (symbol === ")") return token?.kind === "rparen";
    if (symbol === ",") return token?.kind === "comma";
    return token?.kind === "semicolon";
  }
}

function validateListQueryAst(ast: ListQueryAst, resource: ListQueryResource): void {
  const allowlist = getListQueryAllowlist(resource);
  const cmps = collectListQueryCmps(ast);
  for (const cmp of cmps) {
    const field = allowlist.fields[cmp.field];
    if (!field) {
      throw new ListQueryError(`Unknown list filter field: ${cmp.field}`);
    }
    if (!field.ops.includes(cmp.op)) {
      throw new ListQueryError(`Operator ${cmp.op} is not allowed on ${cmp.field}`);
    }
    if (
      cmp.op === "unrestricted" &&
      (cmp.field !== "outcome" || allowlist.partition !== "tracked-jobs")
    ) {
      throw new ListQueryError("outcome=unrestricted= is only allowed on tracked jobs");
    }
    if (field.kind === "number") {
      for (const arg of cmp.args) {
        if (!Number.isFinite(Number(arg))) {
          throw new ListQueryError(`Invalid numeric value for ${cmp.field}`);
        }
      }
    }
    if (field.values && cmp.args.length > 0) {
      for (const arg of cmp.args) {
        if (!field.values.includes(arg)) {
          throw new ListQueryError(`Invalid value ${arg} for ${cmp.field}`);
        }
      }
    }
  }
  if (allowlist.requiredLeaf && !cmps.some((cmp) => cmp.field === allowlist.requiredLeaf)) {
    throw new ListQueryError(`Filter must include a ${allowlist.requiredLeaf} leaf`);
  }
}

export function parseRsql(input: string, resource: ListQueryResource): ListQueryAst {
  const ast = new Parser(tokenize(input.trim())).parse();
  validateListQueryAst(ast, resource);
  return ast;
}

function printValue(value: string): string {
  if (BARE_VALUE.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function printCmp(node: ListQueryCmp): string {
  if (node.op === "empty") return `${node.field}==null`;
  if (node.op === "not_empty") return `${node.field}!=null`;
  if (node.op === "unrestricted") return `${node.field}=unrestricted=`;
  const token = TOKEN_BY_OP[node.op];
  if (node.op === "in" || node.op === "out" || node.op === "between") {
    return `${node.field}${token}(${node.args.map(printValue).join(",")})`;
  }
  return `${node.field}${token}${printValue(node.args[0] ?? "")}`;
}

function printNode(ast: ListQueryAst, parent: "root" | "and" | "or"): string {
  if (ast.type === "cmp") return printCmp(ast);
  const parts = ast.children
    .map((child) => printNode(child, ast.type))
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  const joined = parts.join(ast.type === "and" ? ";" : " or ");
  if (parent !== "root" && parent !== ast.type) return `(${joined})`;
  return joined;
}

export function printRsql(ast: ListQueryAst): string {
  return printNode(ast, "root");
}
