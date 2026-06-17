import { eq, inArray, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { experience } from "#@/schema/experience.schema";

export type ExperienceEntity = InferSelectModel<typeof experience>;
export type CreateExperienceData = Omit<
  InferInsertModel<typeof experience>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateExperienceData = Partial<CreateExperienceData>;
export type ReorderExperienceItem = { id: string; sortOrder: number };

class ExperienceRepository {
  async findAll() {
    return getDb().query.experience.findMany({
      orderBy: (exp, { asc }) => [asc(exp.sortOrder), asc(exp.title)],
      with: {
        projects: {
          orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
          with: {
            stacks: {
              orderBy: (stack, { asc }) => [asc(stack.name)]
            }
          }
        }
      }
    });
  }

  async findById(id: string) {
    return getDb().query.experience.findFirst({
      where: { id },
      with: {
        projects: {
          orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
          with: {
            stacks: {
              orderBy: (stack, { asc }) => [asc(stack.name)]
            }
          }
        }
      }
    });
  }

  async create(input: CreateExperienceData) {
    const all = await this.findAll();
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;

    const [created] = await getDb()
      .insert(experience)
      .values({
        id: crypto.randomUUID(),
        title: input.title,
        organization: input.organization,
        description: input.description,
        fromDate: input.fromDate ?? null,
        toDate: input.toDate ?? null,
        sortOrder: nextSortOrder
      })
      .returning();

    return this.findById(created.id);
  }

  async update(id: string, input: UpdateExperienceData) {
    const [updated] = await getDb()
      .update(experience)
      .set(input)
      .where(eq(experience.id, id))
      .returning();

    if (!updated) return null;

    return this.findById(updated.id);
  }

  async reorder(items: ReorderExperienceItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: experience.id })
      .from(experience)
      .where(inArray(experience.id, ids));

    if (existing.length !== ids.length) {
      throw new Error("One or more experiences not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(experience)
          .set({ sortOrder: item.sortOrder })
          .where(eq(experience.id, item.id));
      }
    });
  }

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(experience)
      .where(eq(experience.id, id))
      .returning({ id: experience.id });

    return deleted ?? null;
  }
}

export const experienceRepository = new ExperienceRepository();
