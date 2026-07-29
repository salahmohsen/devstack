import { createFileRoute, redirect } from "@tanstack/react-router";

import { MailCategoryPage } from "@/pages/dashboard/mail";
import { getCategory, isMailCategoryId } from "@/pages/dashboard/mail/_lib/mail-mock";

function isKnownCategoryParam(value: string): boolean {
  if (isMailCategoryId(value)) return true;
  if (value.startsWith("rule-")) {
    return Boolean(getCategory(`rule:${value.slice("rule-".length)}`));
  }
  return false;
}

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/mail/$category")({
  component: MailCategoryPage,
  beforeLoad: ({ params }) => {
    if (!isKnownCategoryParam(params.category)) {
      throw redirect({ to: "/dashboard/mail" });
    }
  }
});
