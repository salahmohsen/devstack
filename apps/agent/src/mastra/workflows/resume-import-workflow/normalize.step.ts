import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  assignClientIds,
  contactTypeSchema,
  normalizeResumeYear,
  withContactDefaultIcons
} from "@tsu-stack/core";

import { extract } from "#@/mastra/workflows/resume-import-workflow/extract.step";

const CONTACT_TYPES = new Set(contactTypeSchema.options);

function coerceText(value: string | null | undefined): string {
  if (value == null) return "";
  return value.trim();
}

function fallbackProfileName(existingName: string, extractedName?: string | null): string {
  const fromExtract = extractedName?.trim() ?? "";
  if (fromExtract.length >= 2) {
    return fromExtract.slice(0, 120);
  }
  const fromExisting = existingName.trim();
  if (fromExisting.length >= 2) {
    return fromExisting.slice(0, 120);
  }
  return "Owner";
}

function normalizeEmail(value?: string | null): string | null | undefined {
  if (value == null) return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed;
}

function dedupeStackNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Normalize AI extract into draft-shaped data:
 * clientIds, years, stack trim/dedupe, contact icons, selected/included defaults.
 */
export const normalize = createStep({
  id: "normalize",
  description: "Normalizes extract output into a resume import draft shape",
  inputSchema: extract.outputSchema,
  outputSchema: z.object({
    profile: z.object({
      name: z.string(),
      email: z.union([z.literal(""), z.string(), z.null()]).optional(),
      summary: z.string().nullable().optional(),
      contacts: z.array(
        z.object({
          type: contactTypeSchema,
          value: z.string().min(1),
          icon: z.string().optional()
        })
      )
    }),
    experiences: z.array(
      z.object({
        title: z.string().min(1),
        organization: z.string().min(1),
        description: z.string(),
        fromDate: z.string().nullable().optional(),
        toDate: z.string().nullable().optional(),
        isPresent: z.boolean().optional(),
        clientId: z.string().min(1),
        selected: z.boolean(),
        includedInPortfolio: z.boolean()
      })
    ),
    projects: z.array(
      z.object({
        title: z.string().min(1),
        year: z.number().int(),
        summary: z.string(),
        description: z.string(),
        experienceClientId: z.string().nullable().optional(),
        stackNames: z.array(z.string()),
        clientId: z.string().min(1),
        selected: z.boolean(),
        includedInPortfolio: z.boolean()
      })
    ),
    stacks: z.array(
      z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        selected: z.boolean(),
        includedInPortfolio: z.boolean()
      })
    ),
    meta: z
      .object({
        warnings: z.array(z.string()).optional(),
        sourceFilename: z.string().optional()
      })
      .optional()
  }),
  execute: async ({ inputData }) => {
    const { extract: raw, sourceFilename, existingProfile } = inputData;
    const warnings = [...(raw.warnings ?? [])];

    const experienceInputs = (raw.experiences ?? [])
      .map((exp) => {
        const title = coerceText(exp.title);
        const organization = coerceText(exp.organization);
        if (!title || !organization) {
          return null;
        }
        return {
          title,
          organization,
          description: coerceText(exp.description),
          fromDate: exp.fromDate ?? null,
          toDate: exp.toDate ?? null,
          isPresent: exp.isPresent ?? false,
          clientId: exp.clientId?.trim() ? exp.clientId.trim() : undefined,
          selected: true,
          includedInPortfolio: true
        };
      })
      .filter((exp): exp is NonNullable<typeof exp> => exp != null);

    const experiences = assignClientIds(experienceInputs);

    const experienceIds = new Set(experiences.map((e) => e.clientId));

    const projectInputs = (raw.projects ?? [])
      .map((project) => {
        const title = coerceText(project.title);
        if (!title) {
          return null;
        }

        let experienceClientId: string | null = null;
        const byId = project.experienceClientId?.trim();
        if (byId && experienceIds.has(byId)) {
          experienceClientId = byId;
        } else if (
          typeof project.experienceIndex === "number" &&
          project.experienceIndex >= 0 &&
          project.experienceIndex < experiences.length
        ) {
          experienceClientId = experiences[project.experienceIndex]!.clientId;
        }

        const linkedExperience =
          experienceClientId != null
            ? experiences.find((e) => e.clientId === experienceClientId)
            : undefined;

        const year = normalizeResumeYear({
          year: project.year,
          fromDate: project.fromDate ?? linkedExperience?.fromDate,
          toDate: project.toDate ?? linkedExperience?.toDate
        });

        return {
          title,
          year,
          summary: coerceText(project.summary),
          description: coerceText(project.description),
          experienceClientId,
          stackNames: dedupeStackNames(project.stackNames ?? []),
          clientId: project.clientId?.trim() ? project.clientId.trim() : undefined,
          selected: true,
          includedInPortfolio: true
        };
      })
      .filter((p): p is NonNullable<typeof p> => p != null);

    const projects = assignClientIds(projectInputs);

    // Prefer existing stack display names when case-insensitive match.
    const existingNameByKey = new Map<string, string>();
    for (const stack of inputData.existingStacks) {
      const name = stack.name.trim();
      if (!name) continue;
      existingNameByKey.set(name.toLowerCase(), name);
    }

    const stackSeen = new Set<string>();
    const stacks: Array<{
      name: string;
      description: string | null;
      type: string | null;
      selected: boolean;
      includedInPortfolio: boolean;
    }> = [];

    for (const stack of raw.stacks ?? []) {
      const trimmed = stack.name?.trim() ?? "";
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (stackSeen.has(key)) continue;
      stackSeen.add(key);

      const preferredName = existingNameByKey.get(key) ?? trimmed;
      stacks.push({
        name: preferredName,
        description: stack.description?.trim() ? stack.description.trim() : null,
        type: stack.type?.trim() ? stack.type.trim() : null,
        selected: true,
        includedInPortfolio: true
      });
    }

    // Include tech mentioned only on projects.
    for (const project of projects) {
      for (const name of project.stackNames) {
        const key = name.toLowerCase();
        if (stackSeen.has(key)) continue;
        stackSeen.add(key);
        const preferredName = existingNameByKey.get(key) ?? name;
        stacks.push({
          name: preferredName,
          description: null,
          type: null,
          selected: true,
          includedInPortfolio: true
        });
      }
    }

    const rawContacts = raw.profile?.contacts ?? [];
    const contacts = withContactDefaultIcons(
      rawContacts
        .map((c) => {
          const value = coerceText(c.value);
          if (!value) return null;
          if (!CONTACT_TYPES.has(c.type)) {
            warnings.push(`Dropped contact with unsupported type: ${String(c.type)}`);
            return null;
          }
          return {
            type: c.type,
            value,
            icon: c.icon?.trim() ? c.icon.trim() : undefined
          };
        })
        .filter((c): c is NonNullable<typeof c> => c != null)
    );

    const email = normalizeEmail(raw.profile?.email ?? existingProfile.email);

    return {
      profile: {
        name: fallbackProfileName(existingProfile.name, raw.profile?.name),
        email,
        summary: raw.profile?.summary?.trim()
          ? raw.profile.summary.trim()
          : (existingProfile.summary ?? null),
        contacts
      },
      experiences,
      projects,
      stacks,
      meta: {
        warnings: warnings.length > 0 ? warnings : undefined,
        sourceFilename
      }
    };
  }
});
