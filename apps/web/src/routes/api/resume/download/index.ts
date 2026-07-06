import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { createDb, runWithDb } from "@tsu-stack/db";
import { resumeRepository } from "@tsu-stack/db/repositories";

export const Route = createFileRoute("/api/resume/download/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const resumeId = url.searchParams.get("id");

        return runWithDb(createDb(), async () => {
          const resumeRow = resumeId
            ? await resumeRepository.findById(resumeId)
            : await resumeRepository.findDefault();

          if (!resumeRow) {
            return new Response("Resume not found", { status: 404 });
          }

          const object = await env.MEDIA_BUCKET.get(resumeRow.r2Key);
          if (!object) {
            return new Response("PDF not found", { status: 404 });
          }

          const body = await object.blob();
          return new Response(body, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": `attachment; filename="${resumeRow.filename}"`,
              "cache-control": "public, max-age=3600"
            }
          });
        });
      }
    }
  }
});
