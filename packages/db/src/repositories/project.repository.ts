import { eq, inArray, type InferInsertModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { project, projectStack } from "#@/schema/project.schema";

export type CreateProjectData = Omit<
  InferInsertModel<typeof project>,
  "id" | "createdAt" | "updatedAt"
> & {
  stacks?: Omit<InferInsertModel<typeof projectStack>, "id" | "projectId">[];
};

export type UpdateProjectData = Partial<
  Omit<InferInsertModel<typeof project>, "id" | "createdAt" | "updatedAt">
> & {
  stacks?: Omit<InferInsertModel<typeof projectStack>, "id" | "projectId">[];
};

export type ReorderProjectItem = { id: string; sortOrder: number };

class ProjectRepository {
  async findAll() {
    return getDb().query.project.findMany({
      orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
      with: {
        stacks: {
          orderBy: (stack, { asc }) => [asc(stack.name)]
        }
      }
    });
  }

  async findById(id: string) {
    return getDb().query.project.findFirst({
      where: { id },
      with: {
        stacks: {
          orderBy: (stack, { asc }) => [asc(stack.name)]
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
        experienceId: input.experienceId ?? null
      })
      .returning();

    if (input.stacks && input.stacks.length > 0) {
      await getDb()
        .insert(projectStack)
        .values(
          input.stacks.map((stack) => {
            return {
              id: crypto.randomUUID(),
              projectId: created.id,
              name: stack.name,
              iconUrl: stack.iconUrl ?? null
            };
          })
        );
    }

    return this.findById(created.id);
  }

  async update(id: string, input: UpdateProjectData) {
    const { stacks, ...projectFields } = input;

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

    const [updated] = await getDb()
      .update(project)
      .set(updateData)
      .where(eq(project.id, id))
      .returning();

    if (!updated) return null;

    if (stacks !== undefined) {
      await getDb().delete(projectStack).where(eq(projectStack.projectId, id));

      if (stacks.length > 0) {
        await getDb()
          .insert(projectStack)
          .values(
            stacks.map((stack) => {
              return {
                id: crypto.randomUUID(),
                projectId: id,
                name: stack.name,
                iconUrl: stack.iconUrl ?? null
              };
            })
          );
      }
    }

    return this.findById(updated.id);
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
