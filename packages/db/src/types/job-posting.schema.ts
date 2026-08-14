import { jobPosting } from "../schema/index.ts";

const jobPostingSchemaInsert = jobPosting.$inferInsert;
const jobPostingSchemaSelect = jobPosting.$inferSelect;
export type JobPostingSchemaInsert = typeof jobPostingSchemaInsert;
export type JobPostingSchemaSelect = typeof jobPostingSchemaSelect;
