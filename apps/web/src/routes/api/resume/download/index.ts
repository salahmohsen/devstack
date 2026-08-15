import { createFileRoute } from "@tanstack/react-router";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { createFiles } from "@tsu-stack/api/lib/storage/index";

import { buildContentDisposition } from "@/shared/lib/content-disposition";
import { createLogger } from "@/shared/lib/evlog";

import { isUnauthorizedError } from "@/server/protected-download";

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
          const username = url.searchParams.get("username");
          const viewMode = url.searchParams.get("view") === "1";

          log.set({
            hasResumeId: Boolean(resumeId),
            hasUsername: Boolean(username),
            viewMode
          });

          const resumeRow = resumeId
            ? await orpcClient.resume.get({ id: resumeId })
            : username
              ? await orpcClient.resume.getDefault({ username })
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
              "content-disposition": buildContentDisposition(
                disposition,
                resumeRow.filename,
                "resume.pdf"
              ),
              "cache-control": "public, max-age=3600"
            }
          });
        } catch (error) {
          const unauthorized = isUnauthorizedError(error);
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: unauthorized ? "resume_download_unauthorized" : "resume_download_failed",
            status: unauthorized ? 401 : 500
          });
          log.emit({ _forceKeep: true });
          if (unauthorized) {
            return new Response("Sign in to download this resume", { status: 401 });
          }
          throw error;
        }
      }
    }
  }
});
