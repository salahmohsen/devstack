import { createFileRoute } from "@tanstack/react-router";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
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

          const files = createFiles();
          const object = await files.download(resumeRow.r2Key);
          const body = object.stream();
          const viewMode = url.searchParams.get("view") === "1";
          const disposition = viewMode ? "inline" : "attachment";
          return new Response(body, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": `${disposition}; filename="${resumeRow.filename}"`,
              "cache-control": "public, max-age=3600"
            }
          });
        });
      }
    }
  }
});
