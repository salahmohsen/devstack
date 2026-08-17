import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, jobPreferenceRepository, runWithDb } from "@tsu-stack/db";

/**
 * Read-only: why a tracked/inbox row can sit next to current prefs.
 * Prefs filter new landings — they do not retroactively dismiss.
 */
export const explainApplicationVsPrefsTool = createTool({
  id: "explain-application-vs-prefs",
  description:
    "Compare one application to current job rules (mode, place, excludes). Use when they ask why a remote/onsite role is still in the pipeline after a prefs change. Does not write. Prefs are a forward filter — already-tracked rows stay until they dismiss.",
  inputSchema: z.object({
    applicationId: z.string().min(1).optional(),
    id: z.string().min(1).optional().describe("Alias for applicationId.")
  }),
  outputSchema: z.object({
    found: z.boolean(),
    application: z
      .object({
        id: z.string(),
        title: z.string(),
        companyName: z.string(),
        stage: z.string(),
        trackingStatus: z.string(),
        workMode: z.string().nullable(),
        location: z.string().nullable()
      })
      .nullable(),
    prefs: z
      .object({
        workModes: z.array(z.string()),
        locations: z.array(z.string()),
        remoteRegions: z.array(z.string()),
        excludeKeywords: z.array(z.string()),
        levelFloor: z.string().nullable()
      })
      .nullable(),
    mismatches: z.array(z.string()),
    note: z.string()
  }),
  execute: async ({ applicationId, id }, context) => {
    const resolvedId = (applicationId ?? id ?? "").trim();
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId || !resolvedId) {
      return {
        found: false,
        application: null,
        prefs: null,
        mismatches: [],
        note: "Need a real application id from searchApplications / listOpenApplications / listNewJobs."
      };
    }
    const db = createDb();
    const { row, prefs } = await runWithDb(db, async () => {
      return {
        row: await applicationRepository.findByIdForUser(resolvedId, userId),
        prefs: await jobPreferenceRepository.findByUserId(userId)
      };
    });
    if (!row) {
      return {
        found: false,
        application: null,
        prefs: null,
        mismatches: [],
        note: "No application with that id for this user."
      };
    }
    const workModes = prefs?.workModes ?? [];
    const locations = prefs?.locations ?? [];
    const remoteRegions = prefs?.remoteRegions ?? [];
    const excludeKeywords = prefs?.excludeKeywords ?? [];
    const mismatches: string[] = [];
    const mode = row.workMode ?? null;
    if (mode && workModes.length > 0 && !workModes.includes(mode)) {
      mismatches.push(`workMode ${mode} is not in preferred modes (${workModes.join(", ")})`);
    }
    const loc = (row.location ?? "").toLowerCase();
    if (loc && locations.length > 0) {
      const placeHit = locations.some((place) => loc.includes(place.toLowerCase()));
      const regionHit = remoteRegions.some((region) => loc.includes(region.toLowerCase()));
      if (!placeHit && !regionHit && mode !== "remote") {
        mismatches.push(`location "${row.location}" is outside preferred places`);
      }
    }
    const hay = `${row.title} ${row.companyName}`.toLowerCase();
    for (const raw of excludeKeywords) {
      const word = raw.trim().toLowerCase();
      if (word && hay.includes(word)) {
        mismatches.push(`exclude keyword "${raw}" appears in the title/company`);
      }
    }
    return {
      found: true,
      application: {
        id: row.id,
        title: row.title,
        companyName: row.companyName,
        stage: row.stage,
        trackingStatus: row.trackingStatus,
        workMode: row.workMode ?? null,
        location: row.location ?? null
      },
      prefs: {
        workModes,
        locations,
        remoteRegions,
        excludeKeywords,
        levelFloor: prefs?.levelFloor ?? null
      },
      mismatches,
      note: "Preferences filter new landings. Already-tracked or applied rows stay until you dismiss them."
    };
  }
});
