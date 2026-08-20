import { customType } from "drizzle-orm/pg-core";

/**
 * pgvector `vector(n)` column for Postgres.
 * Driver wire format: `[0.1,0.2,...]` string.
 */
export function vector(name: string, config: { dimensions: number }) {
  return customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
    dataType() {
      return `vector(${config.dimensions})`;
    },
    toDriver(value: number[]): string {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("vector column requires a non-empty number array");
      }
      for (const n of value) {
        if (typeof n !== "number" || !Number.isFinite(n)) {
          throw new Error("vector values must be finite numbers");
        }
      }
      return `[${value.join(",")}]`;
    },
    fromDriver(value: unknown): number[] {
      if (Array.isArray(value)) {
        return value.map((n) => Number(n));
      }
      if (typeof value === "string") {
        const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
        if (!inner) return [];
        return inner.split(",").map((part) => Number(part.trim()));
      }
      return [];
    }
  })(name);
}

/** text-embedding-3-small default dimensionality. */
export const OPENAI_EMBEDDING_DIMENSIONS = 1536;
