import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Hub card grid is unused — Career Inbox lives in the island layout at
 * `/dashboard/mail/$category` (default: applications).
 */
export const Route = createFileRoute("/(root-layout)/__protected/dashboard/mail/")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/mail/$category",
      params: { category: "applications" }
    });
  }
});
