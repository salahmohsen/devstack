import { createFileRoute } from "@tanstack/react-router";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { createFiles } from "@tsu-stack/api/lib/storage/index";

import { buildContentDisposition } from "@/shared/lib/content-disposition";
import { createLogger } from "@/shared/lib/evlog";

export const Route = createFileRoute("/api/cover-letter/download/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const log = createLogger({
          operation: "web__cover_letter_download",
          method: "GET",
          path: "/api/cover-letter/download"
        });

        try {
          const url = new URL(request.url);
          const applicationId = url.searchParams.get("applicationId");
          const viewMode = url.searchParams.get("view") === "1";

          log.set({
            hasApplicationId: Boolean(applicationId),
            viewMode
          });

          if (!applicationId) {
            log.set({ event: "cover_letter_download_missing_id", status: 400 });
            log.emit({ _forceKeep: true });
            return new Response("applicationId is required", { status: 400 });
          }

          // Protected oRPC: session user must own the application.
          const application = await orpcClient.applications.get({ id: applicationId });

          if (!application) {
            log.set({ event: "cover_letter_download_not_found", status: 404 });
            log.emit({ _forceKeep: true });
            return new Response("Application not found", { status: 404 });
          }

          if (!application.coverLetterR2Key) {
            log.set({
              event: "cover_letter_download_no_key",
              status: 404,
              applicationId: application.id
            });
            log.emit({ _forceKeep: true });
            return new Response("Cover letter not found", { status: 404 });
          }

          const files = createFiles();
          const object = await files.download(application.coverLetterR2Key);
          const body = object.stream();
          const trimmedName = application.coverLetterFilename?.trim();
          const filename =
            trimmedName && trimmedName.length > 0
              ? trimmedName
              : `cover-letter-${application.id}.pdf`;
          const disposition = viewMode ? "inline" : "attachment";

          log.set({
            event: "cover_letter_download_completed",
            status: 200,
            applicationId: application.id
          });
          log.emit();

          return new Response(body, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": buildContentDisposition(
                disposition,
                filename,
                `cover-letter-${application.id}.pdf`
              ),
              "cache-control": "private, max-age=3600"
            }
          });
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "cover_letter_download_failed"
          });
          log.emit({ _forceKeep: true });
          throw error;
        }
      }
    }
  }
});
