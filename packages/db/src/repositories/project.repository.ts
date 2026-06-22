import { eq, inArray, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { project, projectStack } from "#@/schema/project.schema";
import { stack } from "#@/schema/stack.schema";

export type ProjectEntity = InferSelectModel<typeof project>;

export type CreateProjectData = Omit<
  InferInsertModel<typeof project>,
  "id" | "createdAt" | "updatedAt"
> & {
  stackIds?: string[];
};

export type UpdateProjectData = Partial<
  Omit<InferInsertModel<typeof project>, "id" | "createdAt" | "updatedAt">
> & {
  stackIds?: string[];
};

export type ReorderProjectItem = { id: string; sortOrder: number };

class ProjectRepository {
  async findAll() {
    return getDb().query.project.findMany({
      orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  }

  async findById(id: string) {
    return getDb().query.project.findFirst({
      where: { id },
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  }

  async create(input: CreateProjectData) {
    const projectId = crypto.randomUUID();

    const [created] = await getDb()
      .insert(project)
      .values({
        id: projectId,
        logo: input.logo ?? null,
        year: input.year,
        title: input.title,
        description: input.description,
        fromDate: input.fromDate ?? null,
        toDate: input.toDate ?? null,
        experienceId: input.experienceId ?? null,
        isPresent: input.isPresent ?? false
      })
      .returning();

    if (input.stackIds && input.stackIds.length > 0) {
      await this.attachStacks(created.id, input.stackIds);
    }

    return this.findById(created.id);
  }

  async update(id: string, input: UpdateProjectData) {
    const { stackIds, ...projectFields } = input;

    const updateData: Record<string, unknown> = {};
    if (projectFields.logo !== undefined) updateData.logo = projectFields.logo;
    if (projectFields.year !== undefined) updateData.year = projectFields.year;
    if (projectFields.title !== undefined) updateData.title = projectFields.title;
    if (projectFields.description !== undefined) updateData.description = projectFields.description;
    if (projectFields.fromDate !== undefined) updateData.fromDate = projectFields.fromDate;
    if (projectFields.toDate !== undefined) updateData.toDate = projectFields.toDate;
    if (projectFields.experienceId !== undefined) {
      updateData.experienceId = projectFields.experienceId;
    }
    if (projectFields.isPresent !== undefined) {
      updateData.isPresent = projectFields.isPresent;
    }

    const [updated] = await getDb()
      .update(project)
      .set(updateData)
      .where(eq(project.id, id))
      .returning();

    if (!updated) return null;

    if (stackIds !== undefined) {
      await getDb().delete(projectStack).where(eq(projectStack.projectId, id));

      if (stackIds.length > 0) {
        await this.attachStacks(id, stackIds);
      }
    }

    return this.findById(updated.id);
  }

  private async attachStacks(projectId: string, stackIds: string[]) {
    const unique = [...new Set(stackIds)];

    const existing = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(inArray(stack.id, unique));

    if (existing.length !== unique.length) {
      throw new Error("One or more stacks not found");
    }

    await getDb()
      .insert(projectStack)
      .values(
        unique.map((stackId) => {
          return { id: crypto.randomUUID(), projectId, stackId };
        })
      );
  }

  async reorder(items: ReorderProjectItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: project.id })
      .from(project)
      .where(inArray(project.id, ids));

    if (existing.length !== ids.length) {
      throw new Error("One or more projects not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx.update(project).set({ sortOrder: item.sortOrder }).where(eq(project.id, item.id));
      }
    });
  }

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(project)
      .where(eq(project.id, id))
      .returning({ id: project.id });

    return deleted ?? null;
  }
}

export const projectRepository = new ProjectRepository();
