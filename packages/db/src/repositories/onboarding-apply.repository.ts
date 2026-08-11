import { and, eq, sql } from "drizzle-orm";

import { getDb } from "../index.ts";
import { user } from "../schema/auth.schema.ts";
import { contact } from "../schema/contact.schema.ts";
import { experience } from "../schema/experience.schema.ts";
import { portfolioEntry } from "../schema/portfolio-entry.schema.ts";
import { project, projectStack } from "../schema/project.schema.ts";
import { stack } from "../schema/stack.schema.ts";

export type OnboardingApplyErrorCode = "EMPTY_DRAFT" | "EMAIL_TAKEN";

export class OnboardingApplyError extends Error {
  readonly code: OnboardingApplyErrorCode;

  constructor(code: OnboardingApplyErrorCode, message: string) {
    super(message);
    this.name = "OnboardingApplyError";
    this.code = code;
  }
}

/** Contact types allowed on the contact table. */
export type OnboardingApplyContactType =
  | "website"
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "github"
  | "x"
  | "youtube"
  | "instagram"
  | "discord"
  | "bluesky"
  | "mastodon"
  | "telegram";

/**
 * Local draft shape for Apply (matches core `OnboardingApplyInput` / draft
 * without requiring a runtime dependency on `@tsu-stack/core`).
 * Optional `objectKey` is accepted and ignored (API deletes PDF after commit).
 */
export type OnboardingApplyInput = {
  profile: {
    name: string;
    email?: string | null;
    summary?: string | null;
    contacts?: Array<{
      type: OnboardingApplyContactType;
      value: string;
    }>;
  };
  experiences?: Array<{
    title: string;
    organization: string;
    description?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
    isPresent?: boolean;
    clientId: string;
    selected?: boolean;
    includedInPortfolio?: boolean;
  }>;
  projects?: Array<{
    title: string;
    year: number;
    summary?: string | null;
    description?: string | null;
    experienceClientId?: string | null;
    stackNames?: string[];
    clientId: string;
    selected?: boolean;
    includedInPortfolio?: boolean;
  }>;
  stacks?: Array<{
    name: string;
    description?: string | null;
    type?: string | null;
    selected?: boolean;
    includedInPortfolio?: boolean;
  }>;
  meta?: {
    warnings?: string[];
    sourceFilename?: string;
  };
  /** Session PDF key — stripped/ignored inside Apply (post-commit delete). */
  objectKey?: string;
};

export type OnboardingApplyResult = {
  experiencesCreated: number;
  projectsCreated: number;
  stacksUpserted: number;
};

function normalizeEmail(email: string | null | undefined): string | null {
  if (email == null) return null;
  const trimmed = email.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeSummary(summary: string | null | undefined): string | null {
  if (summary == null) return null;
  const trimmed = summary.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isSelected(row: { selected?: boolean }): boolean {
  return row.selected !== false;
}

/**
 * Apply a reviewed resume-import draft in **one** outer transaction.
 *
 * Does **not** call experience/project/stack/contact repository create/upsert
 * methods (those open their own transactions; contact upsert([]) deletes all).
 *
 * Throws {@link OnboardingApplyError} with:
 * - `EMPTY_DRAFT` — no selected rows and profile is a no-op vs current user
 * - `EMAIL_TAKEN` — draft email belongs to another user
 */
export async function applyOnboardingDraft(
  userId: string,
  draft: OnboardingApplyInput
): Promise<OnboardingApplyResult> {
  const selectedExperiences = (draft.experiences ?? []).filter(isSelected);
  const selectedProjects = (draft.projects ?? []).filter(isSelected);
  const selectedStacks = (draft.stacks ?? []).filter(isSelected);
  const contacts = draft.profile.contacts ?? [];

  const [currentUser] = await getDb().select().from(user).where(eq(user.id, userId)).limit(1);
  if (!currentUser) {
    throw new Error("Session references a user that no longer exists");
  }

  const nextEmail = normalizeEmail(draft.profile.email);
  const nextSummary = normalizeSummary(draft.profile.summary);
  const nameSame = draft.profile.name.trim() === currentUser.name;
  const emailNoOp = nextEmail === null || nextEmail === currentUser.email;
  const summaryNoOp = nextSummary === null || nextSummary === (currentUser.summary ?? "").trim();
  const contactsNoOp = contacts.length === 0;
  const noSelectedRows =
    selectedExperiences.length === 0 &&
    selectedProjects.length === 0 &&
    selectedStacks.length === 0;

  if (noSelectedRows && nameSame && emailNoOp && summaryNoOp && contactsNoOp) {
    throw new OnboardingApplyError(
      "EMPTY_DRAFT",
      "Nothing to apply: no selected items and profile is unchanged"
    );
  }

  const emailChanged = nextEmail !== null && nextEmail !== currentUser.email;
  if (emailChanged) {
    const [collision] = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, nextEmail))
      .limit(1);
    if (collision && collision.id !== userId) {
      throw new OnboardingApplyError("EMAIL_TAKEN", "That email is already in use.");
    }
  }

  let experiencesCreated = 0;
  let projectsCreated = 0;
  let stacksUpserted = 0;

  await getDb().transaction(async (tx) => {
    // 1. Profile user fields + onboardingCompletedAt is set at the end
    const profilePatch: {
      name: string;
      email?: string;
      emailVerified?: boolean;
      summary?: string;
    } = {
      name: draft.profile.name.trim()
    };
    if (emailChanged && nextEmail !== null) {
      profilePatch.email = nextEmail;
      profilePatch.emailVerified = false;
    }
    if (nextSummary !== null) {
      profilePatch.summary = nextSummary;
    }

    await tx.update(user).set(profilePatch).where(eq(user.id, userId));

    // 2. Contact merge by (userId, type) — never delete missing types; never touch portfolio_entry
    if (contacts.length > 0) {
      const byType = new Map<OnboardingApplyContactType, (typeof contacts)[number]>();
      for (const item of contacts) {
        byType.set(item.type, item);
      }

      for (const item of byType.values()) {
        const existing = await tx.query.contact.findFirst({
          where: { userId, type: item.type }
        });

        if (existing) {
          await tx
            .update(contact)
            .set({ value: item.value })
            .where(and(eq(contact.userId, userId), eq(contact.type, item.type)));
        } else {
          await tx.insert(contact).values({
            id: crypto.randomUUID(),
            userId,
            type: item.type,
            value: item.value
          });
        }
      }
    }

    // 3. Selected stacks — case-insensitive name match within this user only
    const allStacks = await tx.select().from(stack).where(eq(stack.userId, userId));
    const stackIdByLowerName = new Map<string, string>();
    for (const row of allStacks) {
      stackIdByLowerName.set(row.name.toLowerCase(), row.id);
    }

    for (const draftStack of selectedStacks) {
      const name = draftStack.name.trim();
      if (!name) continue;

      const lower = name.toLowerCase();
      const existingId = stackIdByLowerName.get(lower);
      const includedInPortfolio = draftStack.includedInPortfolio !== false;

      if (existingId) {
        await tx
          .update(stack)
          .set({
            description: draftStack.description ?? null,
            type: draftStack.type ?? null
          })
          .where(and(eq(stack.id, existingId), eq(stack.userId, userId)));

        if (includedInPortfolio) {
          const existingPe = await tx.query.portfolioEntry.findFirst({
            where: { userId, type: "stack", entityId: existingId }
          });
          if (!existingPe) {
            const pid = crypto.randomUUID();
            await tx.insert(portfolioEntry).values({
              id: pid,
              userId,
              type: "stack",
              entityId: existingId
            });
            await tx
              .update(stack)
              .set({ portfolioEntryId: pid })
              .where(and(eq(stack.id, existingId), eq(stack.userId, userId)));
          }
        }

        stacksUpserted += 1;
      } else {
        const id = crypto.randomUUID();
        const pid = includedInPortfolio ? crypto.randomUUID() : null;

        // Mirror stack.repository.create: portfolio_entry first, then stack
        if (pid) {
          await tx.insert(portfolioEntry).values({
            id: pid,
            userId,
            type: "stack",
            entityId: id
          });
        }

        await tx.insert(stack).values({
          id,
          userId,
          name,
          description: draftStack.description ?? null,
          icon: null,
          type: draftStack.type ?? null,
          confidence: null,
          sortOrder: 0,
          portfolioEntryId: pid
        });

        stackIdByLowerName.set(lower, id);
        stacksUpserted += 1;
      }
    }

    // 4. Orphan stackNames on selected projects → minimal stacks (name only, portfolio on)
    for (const proj of selectedProjects) {
      for (const rawName of proj.stackNames ?? []) {
        const name = rawName.trim();
        if (!name) continue;
        const lower = name.toLowerCase();
        if (stackIdByLowerName.has(lower)) continue;

        const id = crypto.randomUUID();
        const pid = crypto.randomUUID();

        await tx.insert(portfolioEntry).values({
          id: pid,
          userId,
          type: "stack",
          entityId: id
        });

        await tx.insert(stack).values({
          id,
          userId,
          name,
          description: null,
          icon: null,
          type: null,
          confidence: null,
          sortOrder: 0,
          portfolioEntryId: pid
        });

        stackIdByLowerName.set(lower, id);
      }
    }

    // 5. Selected experiences — sequential sortOrder from max+1 for this user
    const [expMaxRow] = await tx
      .select({
        max: sql<number>`coalesce(max(${experience.sortOrder}), -1)`.mapWith(Number)
      })
      .from(experience)
      .where(eq(experience.userId, userId));
    let nextExperienceSort = (expMaxRow?.max ?? -1) + 1;

    const experienceIdByClientId = new Map<string, string>();

    for (const exp of selectedExperiences) {
      const id = crypto.randomUUID();
      const includedInPortfolio = exp.includedInPortfolio !== false;
      const pid = includedInPortfolio ? crypto.randomUUID() : null;

      // portfolio_entry first — experience.portfolio_entry_id FK requires parent row.
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          userId,
          type: "experience",
          entityId: id
        });
      }

      await tx.insert(experience).values({
        id,
        userId,
        title: exp.title,
        organization: exp.organization,
        description: exp.description ?? "",
        fromDate: exp.fromDate ?? null,
        toDate: exp.toDate ?? null,
        sortOrder: nextExperienceSort,
        isPresent: exp.isPresent ?? false,
        portfolioEntryId: pid
      });

      experienceIdByClientId.set(exp.clientId, id);
      nextExperienceSort += 1;
      experiencesCreated += 1;
    }

    // 6. Selected projects — resolve experienceClientId + stackNames; sequential sortOrder
    const [projMaxRow] = await tx
      .select({
        max: sql<number>`coalesce(max(${project.sortOrder}), -1)`.mapWith(Number)
      })
      .from(project)
      .where(eq(project.userId, userId));
    let nextProjectSort = (projMaxRow?.max ?? -1) + 1;

    for (const proj of selectedProjects) {
      const id = crypto.randomUUID();
      const includedInPortfolio = proj.includedInPortfolio !== false;
      const pid = includedInPortfolio ? crypto.randomUUID() : null;

      const experienceId =
        proj.experienceClientId != null && proj.experienceClientId !== ""
          ? (experienceIdByClientId.get(proj.experienceClientId) ?? null)
          : null;

      const stackIds = [
        ...new Set(
          (proj.stackNames ?? [])
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .map((n) => stackIdByLowerName.get(n.toLowerCase()))
            .filter((sid): sid is string => sid != null)
        )
      ];

      // portfolio_entry first — project.portfolio_entry_id FK requires parent row.
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          userId,
          type: "project",
          entityId: id
        });
      }

      await tx.insert(project).values({
        id,
        userId,
        logo: null,
        repos: [],
        demoUrl: null,
        year: proj.year,
        title: proj.title,
        summary: proj.summary ?? "",
        description: proj.description ?? "",
        sortOrder: nextProjectSort,
        experienceId,
        isArchived: false,
        isPresent: false,
        analysis: null,
        portfolioEntryId: pid
      });

      if (stackIds.length > 0) {
        await tx.insert(projectStack).values(
          stackIds.map((stackId) => {
            return { id: crypto.randomUUID(), projectId: id, stackId };
          })
        );
      }

      nextProjectSort += 1;
      projectsCreated += 1;
    }

    // 7. Mark onboarding complete inside the same transaction
    await tx.update(user).set({ onboardingCompletedAt: new Date() }).where(eq(user.id, userId));
  });

  return { experiencesCreated, projectsCreated, stacksUpserted };
}
