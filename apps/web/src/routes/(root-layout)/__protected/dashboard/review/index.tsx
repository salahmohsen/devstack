import { createFileRoute } from "@tanstack/react-router";

import { getListReviewQueryOptions } from "@/features/review";

import { ReviewPage } from "@/pages/dashboard/review";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/review/")({
  component: ReviewPage,
  beforeLoad: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(getListReviewQueryOptions());
  }
});
