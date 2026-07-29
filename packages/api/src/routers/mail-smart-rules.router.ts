import { randomUUID } from "node:crypto";

import {
  CreateMailSmartRuleInputSchema,
  MailCategoryIconSchema,
  MailSmartRuleIdInputSchema,
  MailSmartRuleListOutputSchema,
  MailSmartRuleSchema,
  slugifySmartRuleTitle,
  UpdateMailSmartRuleInputSchema
} from "@tsu-stack/core";
import { mailSmartRuleRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof mailSmartRuleRepository.findByIdForUser>>>
) {
  const icon = MailCategoryIconSchema.safeParse(row.icon);
  return MailSmartRuleSchema.parse({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: icon.success ? icon.data : "sparkles",
    keywords: row.keywords ?? [],
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

export const mailSmartRulesRouter = {
  list: protectedProcedure
    .route({
      description: "List Career Inbox smart rules for the current user",
      method: "GET"
    })
    .output(MailSmartRuleListOutputSchema)
    .handler(async ({ context }) => {
      const rows = await mailSmartRuleRepository.findByUserId(context.session.user.id);
      return rows.map(toOutput);
    }),

  create: protectedProcedure
    .route({
      description: "Create a smart rule (category + keyword match)",
      method: "POST"
    })
    .input(CreateMailSmartRuleInputSchema)
    .output(MailSmartRuleSchema)
    .errors({
      SLUG_TAKEN: { message: "A rule with this slug already exists", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      let slug = input.slug ?? slugifySmartRuleTitle(input.title);
      const existing = await mailSmartRuleRepository.findBySlugForUser(slug, userId);
      if (existing) {
        if (input.slug) throw errors.SLUG_TAKEN();
        slug = `${slug}-${randomUUID().slice(0, 6)}`;
      }

      const existingCount = (await mailSmartRuleRepository.findByUserId(userId)).length;
      const row = await mailSmartRuleRepository.create({
        id: randomUUID(),
        userId,
        slug,
        title: input.title,
        description: input.description ?? "",
        icon: input.icon ?? "sparkles",
        keywords: input.keywords ?? [],
        enabled: input.enabled ?? true,
        sortOrder: existingCount
      });
      return toOutput(row);
    }),

  update: protectedProcedure
    .route({
      description: "Update a smart rule",
      method: "POST"
    })
    .input(UpdateMailSmartRuleInputSchema)
    .output(MailSmartRuleSchema)
    .errors({
      NOT_FOUND: { message: "Smart rule not found", status: 404 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const { id, ...patch } = input;
      const row = await mailSmartRuleRepository.update(id, userId, patch);
      if (!row) throw errors.NOT_FOUND();
      return toOutput(row);
    }),

  delete: protectedProcedure
    .route({
      description: "Delete a smart rule",
      method: "POST"
    })
    .input(MailSmartRuleIdInputSchema)
    .output(MailSmartRuleIdInputSchema)
    .errors({
      NOT_FOUND: { message: "Smart rule not found", status: 404 }
    })
    .handler(async ({ input, context, errors }) => {
      const ok = await mailSmartRuleRepository.delete(input.id, context.session.user.id);
      if (!ok) throw errors.NOT_FOUND();
      return { id: input.id };
    })
};
