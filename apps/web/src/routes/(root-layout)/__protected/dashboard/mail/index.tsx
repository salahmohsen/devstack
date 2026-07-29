import { createFileRoute } from "@tanstack/react-router";

import { MailHubPage } from "@/pages/dashboard/mail";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/mail/")({
  component: MailHubPage
});
