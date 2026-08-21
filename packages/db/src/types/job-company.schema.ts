import { jobCompany } from "../schema/index.ts";

const jobCompanySchemaInsert = jobCompany.$inferInsert;
const jobCompanySchemaSelect = jobCompany.$inferSelect;
export type JobCompanySchemaInsert = typeof jobCompanySchemaInsert;
export type JobCompanySchemaSelect = typeof jobCompanySchemaSelect;
