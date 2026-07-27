import { createFileRoute } from "@tanstack/react-router";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { createFiles } from "@tsu-stack/api/lib/storage/index";

export const Route = createFileRoute("/api/resume/download/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const resumeId = url.searchParams.get("id");
        const profileName = url.searchParams.get("profileName");

        const resumeRow = resumeId
          ? await orpcClient.resume.get({ id: resumeId })
          : profileName
            ? await orpcClient.resume.getDefault({ profileName })
            : null;

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
      }
    }
  }
});
