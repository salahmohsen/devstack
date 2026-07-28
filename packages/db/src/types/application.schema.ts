import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type application } from "../schema/application.schema.ts";

export type ApplicationSchemaSelect = InferSelectModel<typeof application>;
export type ApplicationSchemaInsert = InferInsertModel<typeof application>;
