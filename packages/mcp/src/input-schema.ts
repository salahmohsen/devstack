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

export function buildInputSchema(
  path: string,
  effect: Effect,
  procedure: ProcedureLike
): JsonSchema {
  const hit = cache.get(path);
  if (hit) return hit;

  const zodSchema = procedure["~orpc"]?.inputSchema;
  let schema: JsonSchema = { type: "object", properties: {} };
  if (zodSchema) {
    const [, converted] = converter.convert(zodSchema as never, { strategy: "input" });
    if ((converted as JsonSchema).type === "object") schema = converted as JsonSchema;
  }

  if (isGated(effect)) {
    schema = {
      ...schema,
      properties: {
        ...(schema.properties as Record<string, unknown> | undefined),
        confirmToken: CONFIRM_PROPERTY
      }
    };
  }

  cache.set(path, schema);
  return schema;
}
