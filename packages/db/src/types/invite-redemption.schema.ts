import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type inviteRedemption } from "../schema/invite-redemption.schema.ts";

export type InviteRedemptionSchemaSelect = InferSelectModel<typeof inviteRedemption>;
export type InviteRedemptionSchemaInsert = InferInsertModel<typeof inviteRedemption>;
