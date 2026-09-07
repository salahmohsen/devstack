import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { assignClientIds, contactTypeSchema, normalizeResumeYear } from "@tsu-stack/core";

import { extract } from "#@/mastra/workflows/resume-import-workflow/extract.step";

const CONTACT_TYPES = new Set(contactTypeSchema.options);

function coerceText(value: string | null | undefined): string {
  if (value == null) return "";
  return value.trim();
}

/** Trimmed text, or null when empty — for optional metadata columns. */
function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function fallbackDisplayName(existingName: string, extractedName?: string | null): string {
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

/**
 * Empty / null / undefined pass through (Apply keeps existing user.email).
 * Non-empty values must be valid emails; invalid ones are cleared with a warning.
 */
function normalizeEmail(
  value: string | null | undefined,
  warnings: string[]
): string | null | undefined {
  if (value == null) return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = z.email().safeParse(trimmed);
  if (!parsed.success) {
    warnings.push(`Dropped invalid profile email: ${trimmed}`);
    return null;
  }
  return parsed.data;
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
 * clientIds, years, stack trim/dedupe, contacts, selected/included defaults.
 */
export const normalize = createStep({
  id: "normalize",
  description: "Normalizes extract output into a resume import draft shape",
  inputSchema: extract.outputSchema,
  outputSchema: z.object({
    profile: z.object({
      name: z.string(),
      email: z.union([z.literal(""), z.email(), z.null()]).optional(),
      summary: z.string().nullable().optional(),
      contacts: z.array(
        z.object({
          type: contactTypeSchema,
          value: z.string().min(1)
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
    educations: z.array(
      z.object({
        school: z.string().min(1),
        degree: z.string().min(1),
        field: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        fromDate: z.string().nullable().optional(),
        toDate: z.string().nullable().optional(),
        isPresent: z.boolean().optional(),
        description: z.string().nullable().optional(),
        gpa: z.string().nullable().optional(),
        clientId: z.string().min(1),
        selected: z.boolean()
      })
    ),
    certifications: z.array(
      z.object({
        name: z.string().min(1),
        issuer: z.string().min(1),
        issuedAt: z.string().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
        credentialUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        clientId: z.string().min(1),
        selected: z.boolean()
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

    const educationInputs = (raw.educations ?? [])
      .map((edu) => {
        const school = coerceText(edu.school);
        const degree = coerceText(edu.degree);
        if (!school || !degree) {
          return null;
        }
        return {
          school,
          degree,
          field: textOrNull(edu.field),
          location: textOrNull(edu.location),
          fromDate: textOrNull(edu.fromDate),
          toDate: textOrNull(edu.toDate),
          isPresent: edu.isPresent ?? false,
          description: textOrNull(edu.description),
          gpa: textOrNull(edu.gpa),
          clientId: edu.clientId?.trim() ? edu.clientId.trim() : undefined,
          selected: true
        };
      })
      .filter((edu): edu is NonNullable<typeof edu> => edu != null);

    const educations = assignClientIds(educationInputs);

    const certificationInputs = (raw.certifications ?? [])
      .map((cert) => {
        const name = coerceText(cert.name);
        const issuer = coerceText(cert.issuer);
        if (!name || !issuer) {
          return null;
        }
        return {
          name,
          issuer,
          issuedAt: textOrNull(cert.issuedAt),
          expiresAt: textOrNull(cert.expiresAt),
          credentialUrl: textOrNull(cert.credentialUrl),
          description: textOrNull(cert.description),
          clientId: cert.clientId?.trim() ? cert.clientId.trim() : undefined,
          selected: true
        };
      })
      .filter((cert): cert is NonNullable<typeof cert> => cert != null);

    const certifications = assignClientIds(certificationInputs);

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
    const contacts = rawContacts
      .map((c) => {
        const value = coerceText(c.value);
        if (!value) return null;
        if (!CONTACT_TYPES.has(c.type)) {
          warnings.push(`Dropped contact with unsupported type: ${String(c.type)}`);
          return null;
        }
        return {
          type: c.type,
          value
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    const email = normalizeEmail(raw.profile?.email ?? existingProfile.email, warnings);
    // fallbackDisplayName always returns a name with length ≥ 2 (min for ResumeImportDraftSchema).
    const name = fallbackDisplayName(existingProfile.name, raw.profile?.name);

    return {
      profile: {
        name,
        email,
        summary: raw.profile?.summary?.trim()
          ? raw.profile.summary.trim()
          : (existingProfile.summary ?? null),
        contacts
      },
      experiences,
      projects,
      stacks,
      educations,
      certifications,
      meta: {
        warnings: warnings.length > 0 ? warnings : undefined,
        sourceFilename
      }
    };
  }
});
