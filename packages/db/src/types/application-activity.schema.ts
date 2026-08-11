import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type applicationActivity } from "../schema/application-activity.schema.ts";

export type ApplicationActivitySchemaSelect = InferSelectModel<typeof applicationActivity>;
export type ApplicationActivitySchemaInsert = InferInsertModel<typeof applicationActivity>;
