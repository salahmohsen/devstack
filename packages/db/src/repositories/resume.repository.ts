import {
  and,
  asc,
  desc,
  eq,
  inArray,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { resume } from "../schema/resume.schema.ts";

export type ResumeEntity = InferSelectModel<typeof resume>;
export type CreateResumeData = Omit<
  InferInsertModel<typeof resume>,
  "id" | "createdAt" | "updatedAt" | "default"
>;
export type UpdateResumeData = Partial<Omit<CreateResumeData, "userId">>;

export type ResumeListSortKey = "updatedAt" | "createdAt";

export type ResumeListOptions = {
  where?: SQL;
  sortBy?: ResumeListSortKey;
  sortDir?: "asc" | "desc";
  limit?: number;
};

function andAll(parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return and(...present);
}

export const resumeRepository = {
  async findAllByUserId(userId: string, options?: ResumeListOptions) {
    const sortBy = options?.sortBy ?? "updatedAt";
    const sortDir = options?.sortDir ?? "desc";
    const dir = sortDir === "desc" ? desc : asc;
    const orderBy =
      sortBy === "createdAt"
        ? [dir(resume.createdAt), dir(resume.id)]
        : [dir(resume.updatedAt), dir(resume.id)];
    const query = getDb()
      .select()
      .from(resume)
      .where(andAll([eq(resume.userId, userId), options?.where]) ?? eq(resume.userId, userId))
      .orderBy(...orderBy);
    return options?.limit != null ? query.limit(options.limit) : query;
  },

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.resume.findFirst({
      where: { id, userId }
    });
  },

  async findDefaultByUserId(userId: string) {
    const rows = await getDb()
      .select()
      .from(resume)
      .where(and(eq(resume.userId, userId), eq(resume.default, true)))
      .limit(1);
    return rows[0];
  },

  async create(input: CreateResumeData) {
    const id = crypto.randomUUID();
    const [created] = await getDb()
      .insert(resume)
      .values({
        id,
        userId: input.userId,
        prompt: input.prompt ?? null,
        author: input.author,
        filename: input.filename,
        r2Key: input.r2Key,
        default: false
      })
      .returning();

    return created;
  },

  async setDefault(id: string, userId: string) {
    const owned = await resumeRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    await getDb().transaction(async (tx) => {
      await tx
        .update(resume)
        .set({ default: false })
        .where(and(eq(resume.userId, userId), eq(resume.default, true)));
      await tx
        .update(resume)
        .set({ default: true })
        .where(and(eq(resume.id, id), eq(resume.userId, userId)));
    });

    return resumeRepository.findByIdForUser(id, userId);
  },

  async deleteMany(ids: string[], userId: string) {
    if (ids.length === 0) return [];
    return getDb()
      .delete(resume)
      .where(and(eq(resume.userId, userId), inArray(resume.id, ids)))
      .returning({ id: resume.id, r2Key: resume.r2Key });
  }
};
