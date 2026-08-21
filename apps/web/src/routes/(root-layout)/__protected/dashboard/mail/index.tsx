import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Hub card grid is unused — Career Inbox lives in the island layout at
 * `/dashboard/mail/$category` (default: applications).
 */
export const Route = createFileRoute("/(root-layout)/__protected/dashboard/mail/")({
  validateSearch: (raw: Record<string, unknown>): { message?: string } => {
    const message = raw.message;
    if (typeof message === "string" && message.length > 0) {
      return { message };
    }
    return {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/dashboard/mail/$category",
      params: { category: "applications" },
      search: search.message ? { message: search.message } : {}
    });
  }
});
