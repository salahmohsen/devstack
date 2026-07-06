import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { auth } from "@tsu-stack/auth";
import { createDb, runWithDb } from "@tsu-stack/db";
import { resumeRepository } from "@tsu-stack/db/repositories";

import { deleteResumePdf } from "@/server/resume-service";

const DeleteInputSchema = z.object({
  id: z.string()
});

export const Route = createFileRoute("/api/resume/delete/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const parsed = DeleteInputSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }

        return runWithDb(createDb(), async () => {
          const deleted = await resumeRepository.delete(parsed.data.id);
          if (!deleted) {
            return new Response(JSON.stringify({ success: false }), {
              status: 404,
              headers: { "content-type": "application/json" }
            });
          }

          await deleteResumePdf(deleted.r2Key);

          return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json" }
          });
        });
      }
    }
  }
});
