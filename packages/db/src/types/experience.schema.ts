import { experience } from "#@/schema/index";

const experienceSchemaInsert = experience.$inferInsert;
const experienceSchemaSelect = experience.$inferSelect;
export type ExperienceSchemaInsert = typeof experienceSchemaInsert;
export type ExperienceSchemaSelect = typeof experienceSchemaSelect;
