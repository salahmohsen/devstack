import { ENV_SERVER } from "@tsu-stack/env/server/env";

export const DEFAULT_AUTO_WRITE_THRESHOLD = 0;

export function getAutoWriteThreshold(): number {
  // `z.coerce.number()` produces a number; empty strings would have been
  // coerced to 0 by Zod, so guarding against them is dead code under the
  // current schema. If a future schema change makes the env value nullable,
  // the `typeof raw === "number"` check below still keeps us safe.
  const raw = ENV_SERVER.MASTRA_IDENTITY_AUTO_WRITE_THRESHOLD;
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    throw new Error(`MASTRA_IDENTITY_AUTO_WRITE_THRESHOLD is not a number: ${String(raw)}`);
  }
  return raw;
}

export function shouldAutoWrite(confidence: number): boolean {
  return confidence >= getAutoWriteThreshold();
}
