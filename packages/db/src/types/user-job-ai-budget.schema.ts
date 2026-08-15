import { userJobAiBudget } from "../schema/index.ts";

const userJobAiBudgetSchemaInsert = userJobAiBudget.$inferInsert;
const userJobAiBudgetSchemaSelect = userJobAiBudget.$inferSelect;
export type UserJobAiBudgetSchemaInsert = typeof userJobAiBudgetSchemaInsert;
export type UserJobAiBudgetSchemaSelect = typeof userJobAiBudgetSchemaSelect;
