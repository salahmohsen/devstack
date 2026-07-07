import { eq, inArray, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { resume } from "#@/schema/resume.schema";

export type ResumeEntity = InferSelectModel<typeof resume>;
export type CreateResumeData = Omit<
  InferInsertModel<typeof resume>,
  "id" | "createdAt" | "updatedAt" | "default"
>;
export type UpdateResumeData = Partial<CreateResumeData>;

export const resumeRepository = {
  async findAll() {
    return getDb().query.resume.findMany({
      orderBy: (r, { desc }) => [desc(r.createdAt)]
    });
  },

  async findById(id: string) {
    return getDb().query.resume.findFirst({
      where: { id }
    });
  },

  async findDefault() {
    const rows = await getDb().select().from(resume).where(eq(resume.default, true)).limit(1);
    return rows[0];
  },

  async create(input: CreateResumeData) {
    const id = crypto.randomUUID();
    const [created] = await getDb()
      .insert(resume)
      .values({
        id,
        prompt: input.prompt ?? null,
        author: input.author,
        filename: input.filename,
        r2Key: input.r2Key,
        default: false
      })
      .returning();

    return created;
  },

  async setDefault(id: string) {
    await getDb().transaction(async (tx) => {
      await tx.update(resume).set({ default: false }).where(eq(resume.default, true));
      await tx.update(resume).set({ default: true }).where(eq(resume.id, id));
    });

    return resumeRepository.findById(id);
  },

  async deleteMany(ids: string[]) {
    return getDb()
      .delete(resume)
      .where(inArray(resume.id, ids))
      .returning({ id: resume.id, r2Key: resume.r2Key });
  }
};
