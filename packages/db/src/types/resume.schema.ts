import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type resume } from "../schema/resume.schema.ts";

export type ResumeSchemaSelect = InferSelectModel<typeof resume>;
export type ResumeSchemaInsert = InferInsertModel<typeof resume>;
