import { certification } from "../schema/index.ts";

const certificationSchemaInsert = certification.$inferInsert;
const certificationSchemaSelect = certification.$inferSelect;
export type CertificationSchemaInsert = typeof certificationSchemaInsert;
export type CertificationSchemaSelect = typeof certificationSchemaSelect;
