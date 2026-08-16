import { eq } from "drizzle-orm";

import { backfillRemoteRegionsFromLocations } from "../../../core/src/job-preference/utils.ts";
import { getDb } from "../../src/index.ts";
import { jobPreference } from "../../src/schema/job-preference.schema.ts";

/**
 * One-shot data step: copy non-worldwide location slugs onto remoteRegions
 * using the live TS hiring-region dictionary.
 */
export async function runJobPreferenceRemoteRegionsBackfill(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({
      id: jobPreference.id,
      locations: jobPreference.locations,
      remoteRegions: jobPreference.remoteRegions
    })
    .from(jobPreference);

  let updated = 0;
  for (const row of rows) {
    const next = backfillRemoteRegionsFromLocations(row.locations ?? []);
    const locationsUnchanged =
      JSON.stringify(row.locations ?? []) === JSON.stringify(next.locations);
    const remoteUnchanged =
      JSON.stringify(row.remoteRegions ?? []) === JSON.stringify(next.remoteRegions);
    if (locationsUnchanged && remoteUnchanged) continue;

    await db
      .update(jobPreference)
      .set({
        locations: next.locations,
        remoteRegions: next.remoteRegions
      })
      .where(eq(jobPreference.id, row.id));
    updated += 1;
  }
  return updated;
}
