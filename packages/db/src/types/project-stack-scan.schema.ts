import { projectStackScan } from "../schema/index.ts";

const projectStackScanSchemaInsert = projectStackScan.$inferInsert;
const projectStackScanSchemaSelect = projectStackScan.$inferSelect;

export type ProjectStackScanSchemaInsert = typeof projectStackScanSchemaInsert;
export type ProjectStackScanSchemaSelect = typeof projectStackScanSchemaSelect;
