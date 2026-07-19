import { portfolioEntry } from "../schema/index.ts";

const portfolioEntrySchemaInsert = portfolioEntry.$inferInsert;
const portfolioEntrySchemaSelect = portfolioEntry.$inferSelect;
export type PortfolioEntrySchemaInsert = typeof portfolioEntrySchemaInsert;
export type PortfolioEntrySchemaSelect = typeof portfolioEntrySchemaSelect;
