import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type reviewItem } from "../schema/review-item.schema.ts";

export type ReviewItemSchemaSelect = InferSelectModel<typeof reviewItem>;
export type ReviewItemSchemaInsert = InferInsertModel<typeof reviewItem>;
