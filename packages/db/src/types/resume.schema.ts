import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type resume } from "#@/schema/resume.schema";

export type ResumeSchemaSelect = InferSelectModel<typeof resume>;
export type ResumeSchemaInsert = InferInsertModel<typeof resume>;
