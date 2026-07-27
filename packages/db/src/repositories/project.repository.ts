import {
  and,
  eq,
  inArray,
  isNotNull,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { portfolioEntry } from "../schema/portfolio-entry.schema.ts";
import { project, projectStack } from "../schema/project.schema.ts";
import { stack } from "../schema/stack.schema.ts";

export type ProjectEntity = InferSelectModel<typeof project>;

export type CreateProjectData = Omit<
  InferInsertModel<typeof project>,
  "id" | "createdAt" | "updatedAt"
> & {
  stackIds?: string[];
};

export type UpdateProjectData = Partial<
  Omit<InferInsertModel<typeof project>, "id" | "createdAt" | "updatedAt" | "userId">
> & {
  stackIds?: string[];
};

export type ReorderProjectItem = { id: string; sortOrder: number };

export const projectRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.project.findMany({
      where: { userId },
      orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  },

  async findOptedInByUserId(userId: string, extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: project.id })
      .from(project)
      .where(
        extraWhere
          ? and(eq(project.userId, userId), isNotNull(project.portfolioEntryId), extraWhere)
          : and(eq(project.userId, userId), isNotNull(project.portfolioEntryId))
      )
      .orderBy(project.sortOrder, project.title);

    return Promise.all(rows.map(({ id }) => this.findByIdForUser(id, userId)!));
  },

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.project.findFirst({
      where: { id, userId },
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  },

  async create(input: CreateProjectData, options?: { includedInPortfolio?: boolean }) {
    const projectId = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      // portfolio_entry first — project.portfolio_entry_id FK requires parent row.
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          userId: input.userId,
          type: "project",
          entityId: projectId
        });
      }

      await tx.insert(project).values({
        id: projectId,
        userId: input.userId,
        logo: input.logo ?? null,
        repos: input.repos ?? [],
        demoUrl: input.demoUrl ?? null,
        year: input.year,
        title: input.title,
        summary: input.summary,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
        experienceId: input.experienceId ?? null,
        isArchived: input.isArchived ?? false,
        isPresent: input.isPresent ?? false,
        analysis: input.analysis ?? null,
        portfolioEntryId: pid
      });

      if (input.stackIds && input.stackIds.length > 0) {
        const unique = [...new Set(input.stackIds)];
        const existing = await tx
          .select({ id: stack.id })
          .from(stack)
          .where(and(eq(stack.userId, input.userId), inArray(stack.id, unique)));
        if (existing.length !== unique.length) {
          throw new Error("One or more stacks not found");
        }
        await tx.insert(projectStack).values(
          unique.map((stackId) => {
            return { id: crypto.randomUUID(), projectId, stackId };
          })
        );
      }
    });

    return projectRepository.findByIdForUser(projectId, input.userId);
  },

  async update(
    id: string,
    userId: string,
    input: UpdateProjectData,
    options?: { includedInPortfolio?: boolean }
  ) {
    const { stackIds, ...projectFields } = input;
    let notFound = false;

    await getDb().transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (projectFields.logo !== undefined) updateData.logo = projectFields.logo;
      if (projectFields.repos !== undefined) {
        updateData.repos = projectFields.repos;
      }
      if (projectFields.demoUrl !== undefined) {
        updateData.demoUrl = projectFields.demoUrl;
      }
      if (projectFields.year !== undefined) updateData.year = projectFields.year;
      if (projectFields.title !== undefined) updateData.title = projectFields.title;
      if (projectFields.summary !== undefined) updateData.summary = projectFields.summary;
      if (projectFields.description !== undefined) {
        updateData.description = projectFields.description;
      }
      if (projectFields.experienceId !== undefined) {
        updateData.experienceId = projectFields.experienceId;
      }
      if (projectFields.isArchived !== undefined) {
        updateData.isArchived = projectFields.isArchived;
      }
      if (projectFields.isPresent !== undefined) {
        updateData.isPresent = projectFields.isPresent;
      }
      if (projectFields.analysis !== undefined) {
        updateData.analysis = projectFields.analysis;
      }

      const [updated] = await tx
        .update(project)
        .set(updateData)
        .where(and(eq(project.id, id), eq(project.userId, userId)))
        .returning();

      if (!updated) {
        notFound = true;
        return;
      }

      if (stackIds !== undefined) {
        await tx.delete(projectStack).where(eq(projectStack.projectId, id));
        if (stackIds.length > 0) {
          const unique = [...new Set(stackIds)];
          const existing = await tx
            .select({ id: stack.id })
            .from(stack)
            .where(and(eq(stack.userId, userId), inArray(stack.id, unique)));
          if (existing.length !== unique.length) {
            throw new Error("One or more stacks not found");
          }
          await tx.insert(projectStack).values(
            unique.map((stackId) => {
              return { id: crypto.randomUUID(), projectId: id, stackId };
            })
          );
        }
      }

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { userId, type: "project", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            userId,
            type: "project",
            entityId: id
          });
          await tx
            .update(project)
            .set({ portfolioEntryId: pid })
            .where(and(eq(project.id, id), eq(project.userId, userId)));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(
              and(
                eq(portfolioEntry.userId, userId),
                eq(portfolioEntry.type, "project"),
                eq(portfolioEntry.entityId, id)
              )
            );
          await tx
            .update(project)
            .set({ portfolioEntryId: null })
            .where(and(eq(project.id, id), eq(project.userId, userId)));
        }
      }
    });

    if (notFound) return null;
    return projectRepository.findByIdForUser(id, userId);
  },

  async reorder(userId: string, items: ReorderProjectItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.userId, userId), inArray(project.id, ids)));

    if (existing.length !== ids.length) {
      throw new Error("One or more projects not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(project)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(project.id, item.id), eq(project.userId, userId)));
      }
    });
  },

  async toggleArchived(id: string, userId: string) {
    const [current] = await getDb()
      .select({ isArchived: project.isArchived })
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .limit(1);

    if (!current) return null;

    const next = !current.isArchived;

    const [updated] = await getDb()
      .update(project)
      .set({ isArchived: next })
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .returning();

    if (!updated) return null;

    return projectRepository.findByIdForUser(updated.id, userId);
  },

  async delete(id: string, userId: string) {
    const [deleted] = await getDb()
      .delete(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .returning({ id: project.id });

    return deleted ?? null;
  }
};
