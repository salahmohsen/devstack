import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const resumeAuthorEnum = pgEnum("resume_author", ["admin", "agent"]);

export const resume = pgTable("resume", {
  id: text("id").primaryKey(),
  prompt: text("prompt"),
  author: resumeAuthorEnum("author").notNull(),
  filename: text("filename").notNull(),
  r2Key: text("r2_key").notNull(),
  default: boolean("default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type ResumeAuthor = (typeof resumeAuthorEnum.enumValues)[number];
