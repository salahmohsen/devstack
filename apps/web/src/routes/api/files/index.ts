import { createFileRoute } from "@tanstack/react-router";

import { filesRouter } from "@/server/files-gateway";

export const Route = createFileRoute("/api/files/")({
  server: {
    handlers: {
      GET: ({ request }) => filesRouter.handle(request),
      POST: ({ request }) => filesRouter.handle(request),
      PUT: ({ request }) => filesRouter.handle(request)
    }
  }
});
