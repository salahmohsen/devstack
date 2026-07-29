import { createFileRoute } from "@tanstack/react-router";

import { createLogger } from "@/shared/lib/evlog";

import { filesRouter } from "@/server/files-gateway";

export const Route = createFileRoute("/api/files/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const log = createLogger({
          operation: "web__files_gateway",
          method: "GET",
          path: "/api/files"
        });
        try {
          const response = await filesRouter.handle(request);
          log.set({ event: "files_gateway_completed", status: response.status });
          log.emit();
          return response;
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "files_gateway_failed"
          });
          log.emit({ _forceKeep: true });
          throw error;
        }
      },
      POST: async ({ request }) => {
        const log = createLogger({
          operation: "web__files_gateway",
          method: "POST",
          path: "/api/files"
        });
        try {
          const response = await filesRouter.handle(request);
          log.set({ event: "files_gateway_completed", status: response.status });
          log.emit();
          return response;
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "files_gateway_failed"
          });
          log.emit({ _forceKeep: true });
          throw error;
        }
      },
      PUT: async ({ request }) => {
        const log = createLogger({
          operation: "web__files_gateway",
          method: "PUT",
          path: "/api/files"
        });
        try {
          const response = await filesRouter.handle(request);
          log.set({ event: "files_gateway_completed", status: response.status });
          log.emit();
          return response;
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "files_gateway_failed"
          });
          log.emit({ _forceKeep: true });
          throw error;
        }
      }
    }
  }
});
