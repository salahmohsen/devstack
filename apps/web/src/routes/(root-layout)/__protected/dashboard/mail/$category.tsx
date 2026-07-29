import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  MailListCategorySchema,
  mailSlugToCategoryId,
  type MailListCategory
} from "@tsu-stack/core";

import { getListMailQueryOptions } from "@/features/mail";

import { MailCategoryPage } from "@/pages/dashboard/mail";

function parseKnownCategory(value: string): MailListCategory | null {
  const categoryId = mailSlugToCategoryId(value);
  const parsed = MailListCategorySchema.safeParse(categoryId);
  return parsed.success ? parsed.data : null;
}

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/mail/$category")({
  component: MailCategoryPage,
  beforeLoad: ({ context, params }) => {
    const category = parseKnownCategory(params.category);
    if (!category) {
      throw redirect({ to: "/dashboard/mail" });
    }
    void context.queryClient.ensureQueryData(getListMailQueryOptions({ category }));
  }
});
