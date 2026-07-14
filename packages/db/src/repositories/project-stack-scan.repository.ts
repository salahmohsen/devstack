import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { projectStackScan } from "#@/schema/project-stack-scan.schema";

export type ProjectStackScanEntity = InferSelectModel<typeof projectStackScan>;
export type CreateProjectStackScanData = Omit<
  InferInsertModel<typeof projectStackScan>,
  "id" | "scannedAt"
>;

export const projectStackScanRepository = {
  async findLatestByProjectId(projectId: string) {
    return getDb().query.projectStackScan.findFirst({
      where: { projectId }
    });
  },

  async create(input: CreateProjectStackScanData) {
    const id = crypto.randomUUID();
    await getDb()
      .insert(projectStackScan)
      .values({ id, ...input });
    return this.findById(id);
  },

  async findById(id: string) {
    return getDb().query.projectStackScan.findFirst({ where: { id } });
  }
};
