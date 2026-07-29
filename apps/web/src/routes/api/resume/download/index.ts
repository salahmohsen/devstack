import { createFileRoute } from "@tanstack/react-router";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { createFiles } from "@tsu-stack/api/lib/storage/index";

import { createLogger } from "@/shared/lib/evlog";

export const Route = createFileRoute("/api/resume/download/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const log = createLogger({
          operation: "web__resume_download",
          method: "GET",
          path: "/api/resume/download"
        });

        try {
          const url = new URL(request.url);
          const resumeId = url.searchParams.get("id");
          const profileName = url.searchParams.get("profileName");
          const viewMode = url.searchParams.get("view") === "1";

          log.set({
            hasResumeId: Boolean(resumeId),
            hasProfileName: Boolean(profileName),
            viewMode
          });

          const resumeRow = resumeId
            ? await orpcClient.resume.get({ id: resumeId })
            : profileName
              ? await orpcClient.resume.getDefault({ profileName })
              : null;

          if (!resumeRow) {
            log.set({ event: "resume_download_not_found", status: 404 });
            log.emit({ _forceKeep: true });
            return new Response("Resume not found", { status: 404 });
          }

          const files = createFiles();
          const object = await files.download(resumeRow.r2Key);
          const body = object.stream();
          const disposition = viewMode ? "inline" : "attachment";

          log.set({
            event: "resume_download_completed",
            status: 200,
            resumeId: resumeRow.id
          });
          log.emit();

          return new Response(body, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": `${disposition}; filename="${resumeRow.filename}"`,
              "cache-control": "public, max-age=3600"
            }
          });
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "resume_download_failed"
          });
          log.emit({ _forceKeep: true });
          throw error;
        }
      }
    }
  }
});
