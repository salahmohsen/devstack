import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type invite } from "../schema/invite.schema.ts";

export type InviteSchemaSelect = InferSelectModel<typeof invite>;
export type InviteSchemaInsert = InferInsertModel<typeof invite>;
