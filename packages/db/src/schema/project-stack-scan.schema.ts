import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { project } from "./project.schema.ts";

export const projectStackScan = pgTable(
  "project_stack_scan",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    runId: text("run_id"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
    detectedPackages: text("detected_packages").array(),
    detectedStackIds: text("detected_stack_ids").array()
  },
  (table) => [index("project_stack_scan_project_id_idx").on(table.projectId)]
);
