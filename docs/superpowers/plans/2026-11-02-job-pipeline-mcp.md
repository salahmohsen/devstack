# Job pipeline MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the job pipeline and profile data as a remote MCP server at `/mcp`, authenticated by a user-minted API key, with a two-step confirm gate on outbound and destructive tools.

**Architecture:** New `packages/mcp` holds the allowlist registry, the confirm gate, and a low-level MCP `Server` factory. The router is injected, so the package never imports `packages/api` or env. `apps/server` mounts a stateless Web Standard streamable HTTP transport at `/mcp`, before the global oRPC middleware. Auth is the Better Auth `apiKey` plugin with `enableSessionForAPIKeys`, so the existing `createContext` yields the right session unchanged. A Hono guard rejects `x-api-key` on every path except `/mcp`.

**Tech Stack:** Better Auth 1.6.23 + `@better-auth/api-key`, oRPC 1.14 (`createRouterClient`, `@orpc/zod` converter), `@modelcontextprotocol/sdk` 1.29 (`Server`, `WebStandardStreamableHTTPServerTransport`), Hono, Drizzle, Vite+ (`vp`).

**Spec:** `docs/superpowers/specs/2026-11-02-job-pipeline-mcp-design.md`

**Deviations from the spec, decided while reading the code:**

1. Header is `x-api-key`, not `Authorization: Bearer`. The plugin reads `x-api-key` natively and Claude Code can set custom headers. Bearer would need header rewriting for no gain.
2. `enableSessionForAPIKeys` would let a key authenticate every oRPC route. A guard in Task 3 limits keys to `/mcp`.
3. The registry test uses a fake router. Importing the real `appRouter` pulls env validation into a unit test. The real router is checked by a fail-fast assertion at server boot instead.

**Testing policy note:** `.agents/testing.md` says no tests unless asked. The approved spec asked for two safety tests, so Tasks 3 and 4 include them. Add no others.

---

## File Structure

Create:

- `packages/mcp/package.json`, `tsconfig.json`, `vite.config.ts` — package scaffold, copied from `packages/pdf`.
- `packages/mcp/src/effects.ts` — `Effect` type and `isGated`.
- `packages/mcp/src/registry.ts` — `ToolDef`, `TOOLS` allowlist, `toToolName`, `assertRegistryResolves`.
- `packages/mcp/src/confirm.ts` — stateless HMAC confirm token sign and verify.
- `packages/mcp/src/resolve-path.ts` — walk a dotted path through a router or client.
- `packages/mcp/src/input-schema.ts` — procedure zod to MCP JSON Schema, plus `confirmToken` for gated tools.
- `packages/mcp/src/call-tool.ts` — gate, call, error mapping.
- `packages/mcp/src/server.ts` — `createMcpServer`.
- `packages/mcp/src/index.ts` — public exports.
- `packages/mcp/src/__tests__/confirm.test.ts`, `registry.test.ts`.
- `apps/web/src/pages/dashboard/settings/ui/mcp-settings.tsx` — key manager.
- `apps/web/src/routes/(root-layout)/__protected/dashboard/settings/mcp/index.tsx` — route.
- `.agents/mcp.md` — contributor doc.

Modify:

- `packages/auth/src/auth.ts` — add `apiKey` plugin.
- `packages/auth/src/react/auth-client.ts` — add `apiKeyClient`.
- `packages/db/src/schema/auth.schema.ts` and a generated migration — `apikey` table.
- `apps/server/src/app.ts` — guard plus `/mcp` route.
- `apps/server/package.json` — depend on `@tsu-stack/mcp` and the MCP SDK.
- `apps/web/src/pages/dashboard/settings/ui/settings-layout.tsx` — nav entry.
- `AGENTS.md` — index line.

---

### Task 1: Auth plugin, schema, migration

**Files:**

- Modify: `packages/auth/package.json`, `packages/auth/src/auth.ts:387`, `packages/auth/src/react/auth-client.ts`
- Modify: `packages/db/src/schema/auth.schema.ts`
- Create: generated migration under `packages/db/migrations/`

- [ ] **Step 1: Confirm the DB target is not production**

Run: `grep -n "^DATABASE_URL" packages/env/.env | sed -E 's#//[^@]*@#//***@#'`
Expected: host is `localhost` or a docker host. If it points at production, stop and tell the user (`.agents/workflow.md`).

- [ ] **Step 2: Install the plugin**

Run: `vp add @better-auth/api-key@1.6.23 --filter @tsu-stack/auth`
Expected: `packages/auth/package.json` gains `"@better-auth/api-key": "1.6.23"`. Fallback if the flag is rejected: `pnpm --filter @tsu-stack/auth add @better-auth/api-key@1.6.23`.

- [ ] **Step 3: Register the server plugin**

In `packages/auth/src/auth.ts` add to the imports:

```ts
import { apiKey } from "@better-auth/api-key";
```

Add as the first entry of the `plugins` array at line 387:

```ts
    apiKey({
      defaultPrefix: "tsu_mcp_",
      enableSessionForAPIKeys: true
    }),
```

- [ ] **Step 4: Register the client plugin**

In `packages/auth/src/react/auth-client.ts`:

```ts
import { apiKeyClient } from "@better-auth/api-key/client";
```

and change the plugins line to:

```ts
plugins: [usernameClient(), passkeyClient(), adminClient(), apiKeyClient()];
```

- [ ] **Step 5: Transcribe the plugin's table into Drizzle**

Print the authoritative column list:

Run: `grep -rn "apikey" -A40 node_modules/.pnpm/@better-auth+api-key@1.6.23*/node_modules/@better-auth/api-key/dist/index.mjs | grep -E "fields|type:|required|references|fieldName|modelName" | head -60`

Open `packages/db/src/schema/auth.schema.ts`, follow the style of the existing `passkey` table in that file, and add an `apikey` table with exactly those columns (model name `apikey`, `referenceId` and `configId` if present in this version, `userId` if that is the owner field). Export it. Make sure the Drizzle adapter schema object passed to `betterAuth` includes it (check how `schema` is passed near the `drizzleAdapter` call in `auth.ts`).

- [ ] **Step 6: Generate and apply the migration**

Run: `vp run db:generate`
Expected: one new SQL file creating `apikey`. Open it and confirm it only creates that table.

Run: `vp run db:migrate`
Expected: success, no errors.

- [ ] **Step 7: Typecheck**

Run: `cd packages/auth && vp check`
Expected: PASS. Fix option-name errors against the plugin's types (for example if `defaultPrefix` was renamed).

- [ ] **Step 8: Commit**

```bash
git add packages/auth packages/db pnpm-lock.yaml
git commit -m "feat(auth): add Better Auth api-key plugin and apikey table

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Scaffold `packages/mcp`

**Files:**

- Create: `packages/mcp/package.json`, `tsconfig.json`, `vite.config.ts`, `src/index.ts`

- [ ] **Step 1: Write the scaffold**

`packages/mcp/package.json`:

```json
{
  "name": "@tsu-stack/mcp",
  "private": true,
  "type": "module",
  "imports": {
    "#@/*": "./src/*.ts"
  },
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test:unit": "vp test run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.29.0",
    "@orpc/server": "catalog:",
    "@orpc/zod": "catalog:",
    "@tsu-stack/core": "workspace:*"
  },
  "devDependencies": {
    "@tsu-stack/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:"
  }
}
```

`packages/mcp/tsconfig.json`: copy `packages/pdf/tsconfig.json` verbatim.

`packages/mcp/vite.config.ts`: copy `packages/pdf/vite.config.ts` verbatim.

`packages/mcp/src/index.ts`:

```ts
export {};
```

- [ ] **Step 2: Install**

Run: `vp install`
Expected: workspace links `@tsu-stack/mcp`, lockfile updates.

- [ ] **Step 3: Commit**

```bash
git add packages/mcp pnpm-lock.yaml
git commit -m "chore(mcp): scaffold packages/mcp

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Registry and boot assertion (with test)

**Files:**

- Create: `packages/mcp/src/effects.ts`, `packages/mcp/src/resolve-path.ts`, `packages/mcp/src/registry.ts`
- Test: `packages/mcp/src/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/mcp/src/__tests__/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { assertRegistryResolves, TOOLS, toToolName } from "#@/registry";

describe("toToolName", () => {
  it("snake-cases a dotted path", () => {
    expect(toToolName("applications.updateStage")).toBe("applications_update_stage");
    expect(toToolName("jobDiscovery.findNow")).toBe("job_discovery_find_now");
  });
});

describe("TOOLS", () => {
  it("has unique names under 64 chars", () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name.length <= 64)).toBe(true);
  });

  it("gates every send and every delete", () => {
    const effectOf = (path: string) => TOOLS.find((tool) => tool.path === path)?.effect;
    expect(effectOf("applications.sendOutreach")).toBe("outbound");
    expect(effectOf("mail.sendReply")).toBe("outbound");
    expect(effectOf("applications.acceptApplyPackage")).toBe("outbound");
    for (const tool of TOOLS.filter((t) => /\.(delete|remove)[A-Z]?\w*$/.test(t.path))) {
      expect(tool.effect).toBe("destructive");
    }
  });
});

describe("assertRegistryResolves", () => {
  const fakeProcedure = { "~orpc": {} };

  it("passes when every path exists", () => {
    const router: Record<string, Record<string, unknown>> = {};
    for (const tool of TOOLS) {
      const [group, name] = tool.path.split(".") as [string, string];
      (router[group] ??= {})[name] = fakeProcedure;
    }
    expect(() => assertRegistryResolves(router)).not.toThrow();
  });

  it("throws and names the missing path", () => {
    expect(() => assertRegistryResolves({})).toThrow(/applications\.list/);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `cd packages/mcp && vp test run`
Expected: FAIL, cannot resolve `#@/registry`.

- [ ] **Step 3: Write `effects.ts`**

```ts
export type Effect = "read" | "write" | "outbound" | "destructive";

export function isGated(effect: Effect): boolean {
  return effect === "outbound" || effect === "destructive";
}
```

- [ ] **Step 4: Write `resolve-path.ts`**

```ts
export function resolvePath(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" && typeof node !== "function") return undefined;
    if (node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}
```

- [ ] **Step 5: Write `registry.ts`**

```ts
import { type Effect } from "#@/effects";
import { resolvePath } from "#@/resolve-path";

export type ToolDef = { name: string; path: string; effect: Effect };

export function toToolName(path: string): string {
  return path
    .split(".")
    .map((segment) => segment.replace(/([A-Z])/g, "_$1").toLowerCase())
    .join("_");
}

const tool = (path: string, effect: Effect): ToolDef => ({
  name: toToolName(path),
  path,
  effect
});

const crud = (router: string, extra: ToolDef[] = []): ToolDef[] => [
  tool(`${router}.list`, "read"),
  tool(`${router}.get`, "read"),
  tool(`${router}.create`, "write"),
  tool(`${router}.update`, "write"),
  tool(`${router}.reorder`, "write"),
  tool(`${router}.delete`, "destructive"),
  ...extra
];

export const TOOLS: readonly ToolDef[] = [
  tool("jobDiscovery.findNow", "write"),
  tool("jobDiscovery.searchCities", "read"),

  tool("applications.list", "read"),
  tool("applications.listPage", "read"),
  tool("applications.listBoard", "read"),
  tool("applications.count", "read"),
  tool("applications.get", "read"),
  tool("applications.listActivity", "read"),
  tool("applications.previewListing", "read"),
  tool("applications.previewListingTake", "write"),
  tool("applications.scanJobAlerts", "write"),
  tool("applications.create", "write"),
  tool("applications.promote", "write"),
  tool("applications.dismiss", "write"),
  tool("applications.dismissFromHub", "write"),
  tool("applications.restore", "write"),
  tool("applications.batchDismiss", "write"),
  tool("applications.batchRestore", "write"),
  tool("applications.addNote", "write"),
  tool("applications.update", "write"),
  tool("applications.updateStage", "write"),
  tool("applications.setOutcome", "write"),
  tool("applications.regenerateAgentTake", "write"),
  tool("applications.refreshFromListingUrl", "write"),
  tool("applications.generateApplyPackage", "write"),
  tool("applications.deleteNote", "destructive"),
  tool("applications.delete", "destructive"),
  tool("applications.acceptApplyPackage", "outbound"),
  tool("applications.sendOutreach", "outbound"),

  tool("mail.list", "read"),
  tool("mail.get", "read"),
  tool("mail.assignApplication", "write"),
  tool("mail.unassignApplication", "write"),
  tool("mail.undoCrmApply", "write"),
  tool("mail.correctClassification", "write"),
  tool("mail.generateReply", "write"),
  tool("mail.sendReply", "outbound"),

  tool("notifications.list", "read"),
  tool("notifications.markRead", "write"),
  tool("notifications.markAllRead", "write"),

  tool("jobPreference.get", "read"),
  tool("jobPreference.upsert", "write"),
  tool("jobPreference.resetBoardScoresToday", "write"),
  tool("jobPreference.ensureBrief", "write"),

  tool("search.entities", "read"),

  ...crud("experiences", [tool("experiences.listPage", "read")]),
  ...crud("educations"),
  ...crud("certifications"),
  ...crud("projects", [
    tool("projects.listPage", "read"),
    tool("projects.toggleArchived", "write")
  ]),
  ...crud("stacks", [
    tool("stacks.listPage", "read"),
    tool("stacks.searchNpm", "read"),
    tool("stacks.listDependencies", "read"),
    tool("stacks.merge", "write"),
    tool("stacks.batchMerge", "write"),
    tool("stacks.batchUpdate", "write"),
    tool("stacks.addDependency", "write"),
    tool("stacks.upsertFromDetection", "write"),
    tool("stacks.removeDependency", "destructive")
  ]),

  tool("resume.list", "read"),
  tool("resume.get", "read"),
  tool("resume.setDefault", "write"),
  tool("resume.generate", "write"),
  tool("resume.delete", "destructive")
];

export function assertRegistryResolves(router: unknown): void {
  const missing = TOOLS.filter((def) => resolvePath(router, def.path) === undefined).map(
    (def) => def.path
  );
  if (missing.length > 0) {
    throw new Error(`MCP registry paths missing from router: ${missing.join(", ")}`);
  }
}
```

- [ ] **Step 6: Run the test, expect pass**

Run: `cd packages/mcp && vp test run`
Expected: PASS. If the destructive regex test fails for a name like `removeDependency` (registered destructive, regex only checks `delete` or `remove` after a dot), confirm it is registered `destructive` and fix the registry, not the test.

- [ ] **Step 7: Commit**

```bash
git add packages/mcp
git commit -m "feat(mcp): tool allowlist registry with effects

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Confirm gate (with test)

**Files:**

- Create: `packages/mcp/src/confirm.ts`
- Test: `packages/mcp/src/__tests__/confirm.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { CONFIRM_TTL_MS, signConfirm, verifyConfirm } from "#@/confirm";

const base = { secret: "s".repeat(32), userId: "u1", tool: "mail_send_reply" };
const input = { messageId: "m1", body: "hello" };
const now = 1_000_000;

describe("confirm gate", () => {
  it("accepts a fresh token for the same user, tool, and input", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, input, token, now: now + 1000 })).toBe("ok");
  });

  it("ignores key order in the input", () => {
    const token = signConfirm({ ...base, input, now });
    const reordered = { body: "hello", messageId: "m1" };
    expect(verifyConfirm({ ...base, input: reordered, token, now })).toBe("ok");
  });

  it("rejects changed input", () => {
    const token = signConfirm({ ...base, input, now });
    const tampered = { ...input, body: "different" };
    expect(verifyConfirm({ ...base, input: tampered, token, now })).toBe("invalid");
  });

  it("rejects another user or another tool", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, userId: "u2", input, token, now })).toBe("invalid");
    expect(verifyConfirm({ ...base, tool: "applications_delete", input, token, now })).toBe(
      "invalid"
    );
  });

  it("rejects an expired token", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, input, token, now: now + CONFIRM_TTL_MS + 1 })).toBe("expired");
  });

  it("rejects garbage", () => {
    expect(verifyConfirm({ ...base, input, token: "nope", now })).toBe("invalid");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd packages/mcp && vp test run confirm`
Expected: FAIL, cannot resolve `#@/confirm`.

- [ ] **Step 3: Write `confirm.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const CONFIRM_TTL_MS = 5 * 60_000;

type Parts = { secret: string; userId: string; tool: string; input: unknown };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function mac({ secret, userId, tool, input }: Parts, expiresAt: number): string {
  return createHmac("sha256", `mcp-confirm:${secret}`)
    .update(`${userId}\n${tool}\n${expiresAt}\n${canonical(input)}`)
    .digest("hex");
}

export function signConfirm(parts: Parts & { now?: number }): string {
  const expiresAt = (parts.now ?? Date.now()) + CONFIRM_TTL_MS;
  return `${expiresAt}.${mac(parts, expiresAt)}`;
}

export function verifyConfirm(
  parts: Parts & { token: string; now?: number }
): "ok" | "invalid" | "expired" {
  const [expiresRaw, given] = parts.token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!given || !Number.isFinite(expiresAt)) return "invalid";

  const expected = Buffer.from(mac(parts, expiresAt));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "invalid";

  return (parts.now ?? Date.now()) > expiresAt ? "expired" : "ok";
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd packages/mcp && vp test run`
Expected: PASS, both test files.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp
git commit -m "feat(mcp): stateless confirm token for outbound and destructive tools

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Input schema, tool call, server factory

**Files:**

- Create: `packages/mcp/src/input-schema.ts`, `call-tool.ts`, `server.ts`
- Modify: `packages/mcp/src/index.ts`

- [ ] **Step 1: Write `input-schema.ts`**

```ts
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { isGated, type Effect } from "#@/effects";

type JsonSchema = Record<string, unknown>;

const converter = new ZodToJsonSchemaConverter();
const cache = new Map<string, JsonSchema>();

const CONFIRM_PROPERTY = {
  type: "string",
  description:
    "Required to actually run this tool. Call once without it to get a preview and a token, then call again with the identical input plus this token."
};

type ProcedureLike = {
  "~orpc"?: { inputSchema?: unknown; route?: { summary?: string; description?: string } };
};

export function describeProcedure(procedure: ProcedureLike, fallback: string): string {
  const route = procedure["~orpc"]?.route;
  return route?.description ?? route?.summary ?? fallback;
}

export async function buildInputSchema(
  path: string,
  effect: Effect,
  procedure: ProcedureLike
): Promise<JsonSchema> {
  const hit = cache.get(path);
  if (hit) return hit;

  const zodSchema = procedure["~orpc"]?.inputSchema;
  let schema: JsonSchema = { type: "object", properties: {} };
  if (zodSchema) {
    const [, converted] = await converter.convert(zodSchema as never, { strategy: "input" });
    if ((converted as JsonSchema).type === "object") schema = converted as JsonSchema;
  }

  if (isGated(effect)) {
    schema = {
      ...schema,
      properties: {
        ...((schema.properties as Record<string, unknown> | undefined) ?? {}),
        confirmToken: CONFIRM_PROPERTY
      }
    };
  }

  cache.set(path, schema);
  return schema;
}
```

- [ ] **Step 2: Write `call-tool.ts`**

```ts
import { ORPCError } from "@orpc/server";

import { signConfirm, verifyConfirm, CONFIRM_TTL_MS } from "#@/confirm";
import { isGated } from "#@/effects";
import { type ToolDef } from "#@/registry";
import { resolvePath } from "#@/resolve-path";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const text = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
  ...(isError ? { isError: true } : {})
});

export type CallToolDeps = {
  client: unknown;
  userId: string;
  confirmSecret: string;
  onUnexpectedError: (error: unknown) => void;
};

export async function callTool(
  def: ToolDef,
  rawArgs: Record<string, unknown>,
  deps: CallToolDeps
): Promise<ToolResult> {
  const { confirmToken, ...input } = rawArgs;
  const parts = { secret: deps.confirmSecret, userId: deps.userId, tool: def.name, input };

  if (isGated(def.effect)) {
    if (typeof confirmToken !== "string" || confirmToken.length === 0) {
      return text({
        requiresConfirmation: true,
        tool: def.name,
        effect: def.effect,
        wouldRunWith: input,
        confirmToken: signConfirm(parts),
        expiresInSeconds: CONFIRM_TTL_MS / 1000,
        next: "Show this to the user. If they approve, call the same tool again with the identical input plus confirmToken."
      });
    }
    const verdict = verifyConfirm({ ...parts, token: confirmToken });
    if (verdict !== "ok") {
      return text(
        verdict === "expired"
          ? "Confirmation expired. Call again without confirmToken for a new preview."
          : "Confirmation does not match this tool and input. Call again without confirmToken for a new preview.",
        true
      );
    }
  }

  const procedure = resolvePath(deps.client, def.path);
  if (typeof procedure !== "function") return text(`Unknown tool path ${def.path}`, true);

  try {
    const result = await (procedure as (input: unknown) => Promise<unknown>)(input);
    return text(result ?? null);
  } catch (error) {
    if (error instanceof ORPCError) {
      return text(
        { code: error.code, status: error.status, message: error.message, data: error.data },
        true
      );
    }
    deps.onUnexpectedError(error);
    return text("Internal error. Check server logs.", true);
  }
}
```

- [ ] **Step 3: Write `server.ts`**

```ts
import { createRouterClient, type AnyRouter } from "@orpc/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { type OrpcContext } from "@tsu-stack/core";

import { callTool } from "#@/call-tool";
import { buildInputSchema, describeProcedure } from "#@/input-schema";
import { TOOLS } from "#@/registry";
import { resolvePath } from "#@/resolve-path";

export function createMcpServer(args: {
  router: AnyRouter;
  context: OrpcContext;
  confirmSecret: string;
}): Server {
  const userId = args.context.session?.user?.id;
  if (!userId) throw new Error("createMcpServer requires an authenticated context");

  const client = createRouterClient(args.router, { context: args.context });
  const server = new Server(
    { name: "tsu-stack-job-pipeline", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await Promise.all(
      TOOLS.map(async (def) => {
        const procedure = resolvePath(args.router, def.path) as Parameters<
          typeof describeProcedure
        >[0];
        return {
          name: def.name,
          description: `${describeProcedure(procedure, `Calls ${def.path}.`)} [${def.effect}]`,
          inputSchema: (await buildInputSchema(def.path, def.effect, procedure)) as {
            type: "object";
          },
          annotations: {
            readOnlyHint: def.effect === "read",
            destructiveHint: def.effect === "destructive" || def.effect === "outbound",
            openWorldHint: def.effect === "outbound"
          }
        };
      })
    )
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const def = TOOLS.find((tool) => tool.name === request.params.name);
    if (!def) {
      return {
        content: [{ type: "text", text: `Unknown tool ${request.params.name}` }],
        isError: true
      };
    }
    return callTool(def, (request.params.arguments ?? {}) as Record<string, unknown>, {
      client,
      userId,
      confirmSecret: args.confirmSecret,
      onUnexpectedError: (error) =>
        args.context.logger.error(error instanceof Error ? error : String(error))
    });
  });

  return server;
}
```

- [ ] **Step 4: Export**

`packages/mcp/src/index.ts`:

```ts
export { createMcpServer } from "#@/server";
export { assertRegistryResolves, TOOLS } from "#@/registry";
```

- [ ] **Step 5: Typecheck**

Run: `cd packages/mcp && vp check`
Expected: PASS. Likely fixes: the `OrpcContext` session shape (adjust the optional chain if `session.user` is typed differently), the `converter.convert` option type, and the `inputSchema` cast. Fix types, do not loosen logic.

- [ ] **Step 6: Commit**

```bash
git add packages/mcp
git commit -m "feat(mcp): MCP server factory over the oRPC router

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Mount `/mcp` and the API-key guard

**Files:**

- Modify: `apps/server/package.json`, `apps/server/src/app.ts`

- [ ] **Step 1: Add dependencies**

Run: `vp add @tsu-stack/mcp@workspace:* @modelcontextprotocol/sdk@1.29.0 --filter @tsu-stack/server`
Expected: both appear in `apps/server/package.json`. Fallback: `pnpm --filter @tsu-stack/server add @tsu-stack/mcp@workspace:* @modelcontextprotocol/sdk@1.29.0`.

- [ ] **Step 2: Add imports to `apps/server/src/app.ts`**

```ts
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { assertRegistryResolves, createMcpServer } from "@tsu-stack/mcp";
```

- [ ] **Step 3: Add boot assertion, guard, and route**

Insert after the `app.on(["POST", "GET"], "/auth/*", ...)` line and before `app.post("/webhooks/github", ...)`:

```ts
assertRegistryResolves(appRouter);

/** API keys authenticate /mcp only. Everywhere else they are rejected, not ignored. */
app.use("*", async (c, next) => {
  const isMcpPath = new URL(c.req.url).pathname.endsWith("/mcp");
  if (!isMcpPath && c.req.header("x-api-key")) {
    return c.json({ message: "API keys are only accepted on /mcp." }, 401);
  }
  await next();
});

app.all("/mcp", async (c) => {
  const db = createDb();
  return runWithDb(db, async () => {
    const context = await createContext({
      context: c,
      logger: c.get("log"),
      runtime: getRuntime()
    });
    if (!context.session?.user) {
      return c.json({ message: "Missing or invalid x-api-key." }, 401);
    }

    const server = createMcpServer({
      router: appRouter,
      context,
      confirmSecret: ENV_SERVER.BETTER_AUTH_SECRET
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });
});
```

The route sits above the global `app.use("/*", ...)` oRPC middleware, so it is matched first.

- [ ] **Step 4: Typecheck**

Run: `cd apps/server && vp check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server packages/mcp pnpm-lock.yaml
git commit -m "feat(server): mount /mcp with api-key-only guard

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Real-run verification (before any UI)

Per `principle-prove-it-works`: run it end to end first.

- [ ] **Step 1: Start the stack**

Run: `pnpm run dev` (background). Wait for the server on port 5200.
Expected: no boot error. A boot error naming `MCP registry paths missing` means a wrong procedure name in `TOOLS`. Fix the registry.

- [ ] **Step 2: Mint a key without the UI**

Sign in through the web app in the browser, then in the browser console on the app origin run:

```js
await fetch("/api/auth/api-key/create", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "local-test" })
}).then((r) => r.json());
```

If the auth path differs, use `${VITE_SERVER_URL}/auth/api-key/create`. Expected: JSON containing `key` starting `tsu_mcp_`. Export it as `MCP_KEY`.

- [ ] **Step 3: List tools**

Run:

```bash
curl -s -X POST "$VITE_SERVER_URL/mcp" -H "content-type: application/json" -H "accept: application/json, text/event-stream" -H "x-api-key: $MCP_KEY" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 600
```

Expected: JSON with a `tools` array of about 60 entries.

- [ ] **Step 4: Call a read tool and a write tool**

```bash
curl -s -X POST "$VITE_SERVER_URL/mcp" -H "content-type: application/json" -H "accept: application/json, text/event-stream" -H "x-api-key: $MCP_KEY" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"applications_count","arguments":{}}}'
```

Expected: a text result with counts, no `isError`. Then move one real application through `applications_update_stage` and confirm the change in the web app.

- [ ] **Step 5: Confirm the gate**

Call `applications_send_outreach` with real arguments and no token.
Expected: `requiresConfirmation: true`, a `confirmToken`, and no email sent. Call again with a changed argument plus the old token.
Expected: `isError`, mismatch message. Only then call with the exact input plus the token on a test application you control, and confirm one email goes out.

- [ ] **Step 6: Confirm the key is fenced**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "x-api-key: $MCP_KEY" "$VITE_SERVER_URL/rpc/applications/count"
```

Expected: `401`. And a call to `/mcp` with no key returns `401`.

- [ ] **Step 7: Record the results**

Paste the status codes and the stage-change evidence into the PR description. Fix anything that failed before continuing.

---

### Task 8: Settings UI for keys

Load `better-ui` and `impeccable` first (`AGENTS.md` UI entry), then `.agents/ui.md`.

**Files:**

- Create: `apps/web/src/pages/dashboard/settings/ui/mcp-settings.tsx`
- Create: `apps/web/src/routes/(root-layout)/__protected/dashboard/settings/mcp/index.tsx`
- Modify: `apps/web/src/pages/dashboard/settings/ui/settings-layout.tsx`

- [ ] **Step 1: Read the template**

Read `apps/web/src/pages/dashboard/settings/ui/passkey-manager.tsx` and `settings-section.tsx`. The key manager mirrors the passkey manager: query list, create dialog, delete confirm.

- [ ] **Step 2: Write the route**

`apps/web/src/routes/(root-layout)/__protected/dashboard/settings/mcp/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { McpSettings } from "@/pages/dashboard/settings/ui/mcp-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/mcp/")({
  component: McpSettings
});
```

- [ ] **Step 3: Write `mcp-settings.tsx`**

```tsx
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

import { SettingsFrame } from "./settings-frame";
import { SettingsSection } from "./settings-section";

const keysQuery = queryOptions({
  queryKey: ["mcp", "api-keys"],
  queryFn: async () => {
    const result = await authClient.apiKey.list();
    if (result.error) throw new Error(result.error.message);
    return result.data?.apiKeys ?? result.data ?? [];
  }
});

export function McpSettings() {
  const queryClient = useQueryClient();
  const { data: keys = [] } = useQuery(keysQuery);
  const [fresh, setFresh] = useState<string | null>(null);
  const endpoint = `${import.meta.env.VITE_SERVER_URL}/mcp`;

  async function create() {
    const result = await authClient.apiKey.create({
      name: `mcp-${new Date().toISOString().slice(0, 10)}`
    });
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Could not create key");
      return;
    }
    setFresh(result.data.key);
    await queryClient.invalidateQueries({ queryKey: keysQuery.queryKey });
  }

  async function revoke(keyId: string) {
    const result = await authClient.apiKey.delete({ keyId });
    if (result.error) {
      toast.error(result.error.message ?? "Could not revoke key");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: keysQuery.queryKey });
  }

  return (
    <SettingsFrame
      title="MCP access"
      description="Control your job pipeline from Claude Code or any MCP client."
    >
      <SettingsSection title="Connect a client">
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm">{`claude mcp add --transport http jobs ${endpoint} --header "x-api-key: <your key>"`}</pre>
        <p className="text-muted-foreground text-sm">
          Sends, replies, and deletes always return a preview first. Nothing goes out until the
          client repeats the call with the confirm token.
        </p>
      </SettingsSection>

      <SettingsSection title="API keys">
        {fresh ? (
          <Alert>
            <KeyRoundIcon />
            <AlertTitle>Copy this key now. It is shown once.</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              <code className="break-all">{fresh}</code>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Copy key"
                onClick={() => {
                  void navigator.clipboard.writeText(fresh);
                  toast.success("Copied");
                }}
              >
                <CopyIcon />
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <ul className="divide-y">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between py-2">
              <span className="text-sm">
                {key.name ?? "Key"} <span className="text-muted-foreground">{key.start}…</span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Revoke key"
                onClick={() => void revoke(key.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>

        <Button onClick={() => void create()}>
          <PlusIcon /> New key
        </Button>
      </SettingsSection>
    </SettingsFrame>
  );
}
```

Adjust prop names (`SettingsFrame`, `SettingsSection`, `Alert`) to what `shortcuts-settings.tsx` and `passkey-manager.tsx` actually use. The plugin's list result shape also differs by version, so let the typecheck decide the `apiKeys` access.

- [ ] **Step 4: Add the nav entry**

In `settings-layout.tsx`, add `"/dashboard/settings/mcp"` to the `to` union at line 35, and add after the `shortcuts` entry:

```tsx
  {
    id: "mcp",
    label: "MCP access",
    description: "API keys for Claude Code and other MCP clients",
    to: "/dashboard/settings/mcp",
    icon: KeyRound,
    group: "You"
  },
```

Import `KeyRound` from `lucide-react` alongside the existing icons, and add `"mcp"` to any id union the file declares.

- [ ] **Step 5: Check and run in the browser**

Run: `cd apps/web && vp check`
Expected: PASS. Regenerate the route tree if the project requires it (it normally regenerates under `vp run dev`).

Open `/dashboard/settings/mcp`. Create a key, copy it, run the Task 7 `tools/list` curl with it, then revoke it and confirm the same curl now returns 401.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): settings page to mint and revoke MCP API keys

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Docs, full validation, PR

**Files:**

- Create: `.agents/mcp.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write `.agents/mcp.md`**

```md
# MCP server

Remote MCP at `/mcp`, implemented in `packages/mcp`, mounted in `apps/server/src/app.ts`.

- Auth: Better Auth `apiKey` plugin. Send `x-api-key`. Keys work on `/mcp` only, a guard rejects them elsewhere.
- Adding a tool: add one line to `TOOLS` in `packages/mcp/src/registry.ts` with the right `effect`. The server asserts every path exists at boot.
- Effects: `read`, `write`, `outbound` (emails a person), `destructive` (deletes). `outbound` and `destructive` are gated by a confirm token, see `confirm.ts`. Never skip the gate for a send.
- Excluded on purpose: admin, auth settings, connections, domain, github, signup policy, onboarding, public portfolio, agent.
- Tools call the same oRPC procedures as the website, so tenant scoping is unchanged. Do not add business logic in the MCP layer.
```

In `AGENTS.md`, under "Shared Packages And Platform", add:

```md
- [MCP server](.agents/mcp.md) for the `/mcp` endpoint, API-key auth, the tool allowlist, and the outbound confirm gate.
```

- [ ] **Step 2: Full validation**

Run: `vp run -w fix`
Expected: PASS.

Run: `vp run test:unit:run`
Expected: PASS, including the two `packages/mcp` test files.

- [ ] **Step 3: Commit and open the PR**

Follow the Opening a PR playbook. Link the spec and this plan. Include the Task 7 evidence: tools count, the stage-change proof, the gate behavior, and the `401` checks.

```bash
git add .agents/mcp.md AGENTS.md
git commit -m "docs: MCP server contributor guide

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage.** Transport and mount: Task 6. Auth: Tasks 1, 6, 8. In-process router client: Task 5. Allowlist with effects and annotations: Tasks 3, 5. Confirm gate: Tasks 4, 5. Async tools: they return the enqueue result unchanged, nothing extra needed. Error mapping: Task 5 `callTool`. Verification: Tasks 3, 4 (tests) and 7 (real run). Open items from the spec: `createContext` works unchanged because `enableSessionForAPIKeys` feeds `getSession`. Plugin fits 1.6.23. UI is Task 8. `generateApplyPackage` is exposed as enqueue with no polling tool, to be revisited if Task 7 shows it blocks.
- **Placeholders.** None. Steps that depend on library output (Task 1 Step 5, Task 8 prop names) name the exact command or file to read and what to produce.
- **Type consistency.** `ToolDef`, `Effect`, `isGated`, `signConfirm`, `verifyConfirm`, `CONFIRM_TTL_MS`, `resolvePath`, `buildInputSchema`, `describeProcedure`, `callTool`, `createMcpServer`, `assertRegistryResolves` are named identically across tasks.
- **Known risks.** (1) The plugin's schema or option names may differ from the docs in 1.6.23, so Task 1 Steps 5 and 7 verify against the installed package. (2) The destructive-name regex in the registry test is intentionally loose, and it should fail loudly if someone adds a `delete` without gating it. (3) The confirm preview echoes the input rather than rendering the email, which is honest but plain. A richer preview is a later improvement.
