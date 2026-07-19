import { githubConfig } from "../schema/index.ts";

const githubConfigSchemaInsert = githubConfig.$inferInsert;
const githubConfigSchemaSelect = githubConfig.$inferSelect;
export type GithubConfigSchemaInsert = typeof githubConfigSchemaInsert;
export type GithubConfigSchemaSelect = typeof githubConfigSchemaSelect;
