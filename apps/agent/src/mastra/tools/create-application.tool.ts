import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  inferApplicationSource
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

import { linkJobSkillsForUserInAgent } from "#@/mastra/lib/link-job-skills";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Create (or find by listing URL) a CRM application for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * chat handler). Never accept `userId` from tool input.
 *
 * - With `url`: canonicalize → race-safe `createIfAbsentByUrl`.
 * - Without `url`: plain `create`.
 * Always stores full `description` on create.
 */
export const createApplicationTool = createTool({
  id: "create-application",
  description:
    "Create a job application in CRM (stage saved). Prefer after propose-application-from-jd save|package. Pass full description. With url uses create-if-absent; without url always inserts. Requires HITL approval.",
  inputSchema: z.object({
    title: z.string().min(1).max(300).describe("Job title to save"),
    companyName: z.string().min(1).max(200).describe("Employer name to save"),
    description: z.string().min(1).max(50_000).describe("Full JD body to store on the CRM row"),
    url: z.string().url().optional().nullable().describe("Listing URL when known"),
    applyUrl: z.string().url().optional().nullable().describe("External apply URL when known"),
    location: z.string().max(200).optional().nullable().describe("Location text, or null"),
    matchScore: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .nullable()
      .describe("0–100 fit score from the proposal"),
    notes: z.string().max(2000).optional().nullable().describe("Short agent take to store")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    applicationId: z.string().optional(),
    created: z.boolean().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async (input, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Missing session user for create-application"
      };
    }

    const rawUrl = input.url?.trim() ?? "";
    let listingUrl: string | null = null;
    if (rawUrl.length > 0) {
      if (!isHttpUrl(rawUrl)) {
        return {
          ok: false,
          code: "INVALID_URL",
          message: "Listing url must be http(s)"
        };
      }
      listingUrl = canonicalizeJobUrl(rawUrl) ?? rawUrl;
    }

    const rawApply = input.applyUrl?.trim() ?? "";
    let applyUrl: string | null = null;
    if (rawApply.length > 0) {
      if (!isHttpUrl(rawApply)) {
        return {
          ok: false,
          code: "INVALID_URL",
          message: "applyUrl must be http(s)"
        };
      }
      applyUrl = rawApply;
    }

    const platform = listingUrl ? inferApplicationSource(listingUrl) : null;
    const sourceTags = buildApplicationSourceTags({ channel: "hub", platform });
    const linked = await linkJobSkillsForUserInAgent({
      userId,
      title: input.title,
      companyName: input.companyName,
      description: input.description,
      listingUrl,
      mastra: context.mastra
    });
    const common = {
      userId,
      companyName: input.companyName,
      title: input.title,
      applyUrl,
      location: input.location ?? null,
      matchScore: input.matchScore ?? null,
      description: input.description,
      notes: input.notes ?? null,
      source: platform,
      sourceTags,
      requiredSkills: linked.requiredSkills,
      preferredSkills: linked.preferredSkills,
      trackingStatus: "tracked" as const,
      stage: "saved" as const,
      hiringUrgency: "unknown" as const,
      resumeId: null
    };

    const db = createDb();
    if (listingUrl) {
      const { row, created } = await runWithDb(db, async () => {
        const result = await applicationRepository.createIfAbsentByUrl({
          ...common,
          url: listingUrl
        });
        // URL conflict with inbox/dismissed → promote + merge non-empty hub fields.
        if (!result.created && result.row.trackingStatus !== "tracked") {
          const from = result.row.trackingStatus;
          const promoted = await applicationRepository.setTrackingStatus(
            result.row.id,
            userId,
            "tracked"
          );
          if (promoted) {
            const merged = await applicationRepository.update(promoted.id, userId, {
              title: input.title,
              companyName: input.companyName,
              description: input.description,
              applyUrl,
              location: input.location ?? null,
              matchScore: input.matchScore ?? null,
              notes: input.notes ?? null,
              source: platform ?? promoted.source,
              sourceTags
            });
            await applicationActivityRepository.append({
              userId,
              applicationId: promoted.id,
              kind: "promoted",
              actorUserId: userId,
              metadata: { from, via: "hub_create_conflict" }
            });
            return { row: merged ?? promoted, created: false };
          }
        }
        if (result.created) {
          await applicationActivityRepository.append({
            userId,
            applicationId: result.row.id,
            kind: "discovered",
            actorUserId: userId,
            metadata: { via: "hub_create", sourceTags }
          });
        }
        return result;
      });
      return { ok: true, applicationId: row.id, created };
    }

    const row = await runWithDb(db, async () => {
      const created = await applicationRepository.create({
        ...common,
        url: null
      });
      await applicationActivityRepository.append({
        userId,
        applicationId: created.id,
        kind: "discovered",
        actorUserId: userId,
        metadata: { via: "hub_create", sourceTags }
      });
      return created;
    });
    return { ok: true, applicationId: row.id, created: true };
  }
});
