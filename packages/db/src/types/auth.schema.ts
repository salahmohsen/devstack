import { account, passkey, session, user, verification } from "#@/schema/index";

const userSchemaInsert = user.$inferInsert;
const userSchemaSelect = user.$inferSelect;
export type UserSchemaInsert = Omit<
  typeof userSchemaInsert,
  "createdAt" | "updatedAt" | "emailVerified" | "id"
>;
export type UserSchemaSelect = typeof userSchemaSelect;

const sessionSchemaInsert = session.$inferInsert;
const sessionSchemaSelect = session.$inferSelect;
export type SessionSchemaInsert = typeof sessionSchemaInsert;
export type SessionSchemaSelect = typeof sessionSchemaSelect;

const accountSchemaInsert = account.$inferInsert;
const accountSchemaSelect = account.$inferSelect;
export type AccountSchemaInsert = typeof accountSchemaInsert;
export type AccountSchemaSelect = typeof accountSchemaSelect;

const verificationSchemaInsert = verification.$inferInsert;
const verificationSchemaSelect = verification.$inferSelect;
export type VerificationSchemaInsert = typeof verificationSchemaInsert;
export type VerificationSchemaSelect = typeof verificationSchemaSelect;

const passkeySchemaInsert = passkey.$inferInsert;
const passkeySchemaSelect = passkey.$inferSelect;
export type PasskeySchemaInsert = typeof passkeySchemaInsert;
export type PasskeySchemaSelect = typeof passkeySchemaSelect;
