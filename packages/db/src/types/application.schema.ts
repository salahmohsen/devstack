import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type application, type ApplicationJobSkillTag } from "../schema/application.schema.ts";

export type { ApplicationJobSkillTag };

export type ApplicationSchemaSelect = InferSelectModel<typeof application>;
export type ApplicationSchemaInsert = InferInsertModel<typeof application>;
