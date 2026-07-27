import { userCustomDomain } from "../schema/index.ts";

const userCustomDomainSchemaInsert = userCustomDomain.$inferInsert;
const userCustomDomainSchemaSelect = userCustomDomain.$inferSelect;
export type UserCustomDomainSchemaInsert = typeof userCustomDomainSchemaInsert;
export type UserCustomDomainSchemaSelect = typeof userCustomDomainSchemaSelect;
