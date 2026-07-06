import { createFileRoute } from "@tanstack/react-router";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { auth } from "@tsu-stack/auth";

import { generateResume } from "@/server/resume-service";

export const Route = createFileRoute("/api/resume/generate/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        const portfolio = await orpcClient.portfolio.list({ paginated: false, limit: 100 });
        const profile = await orpcClient.profile.get({ disableContacts: true });

        const resume = await generateResume({ portfolio: portfolio, profile: profile });

        return new Response(JSON.stringify(resume), {
          headers: { "content-type": "application/json" }
        });
      }
    }
  }
});
