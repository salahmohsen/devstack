import { createFileRoute } from "@tanstack/react-router";

import { ReviewPage } from "@/pages/dashboard/review";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/review/")({
  component: ReviewPage
});
