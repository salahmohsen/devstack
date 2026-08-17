import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type userHubState } from "../schema/user-hub-state.schema.ts";

export type UserHubStateSchemaSelect = InferSelectModel<typeof userHubState>;
export type UserHubStateSchemaInsert = InferInsertModel<typeof userHubState>;
