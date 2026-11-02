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

function toObjectSchema(schema: JsonSchema): JsonSchema | null {
  if (schema.type === "object") return schema;
  if (!Array.isArray(schema.allOf)) return null;

  const parts = (schema.allOf as JsonSchema[]).map(toObjectSchema);
  if (parts.some((part) => part === null)) return null;

  const objects = parts as JsonSchema[];
  const required = new Set(
    objects.flatMap((part) => (part.required as string[] | undefined) ?? [])
  );
  return {
    type: "object",
    properties: Object.assign({}, ...objects.map((part) => part.properties)),
    ...(required.size > 0 ? { required: [...required] } : {})
  };
}

export function buildInputSchema(
  path: string,
  effect: Effect,
  procedure: ProcedureLike
): JsonSchema {
  const hit = cache.get(path);
  if (hit) return hit;

  const zodSchema = procedure["~orpc"]?.inputSchema;
  let schema: JsonSchema = { type: "object", properties: {}, additionalProperties: true };
  if (zodSchema) {
    const [, converted] = converter.convert(zodSchema as never, { strategy: "input" });
    schema = toObjectSchema(converted as JsonSchema) ?? schema;
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
