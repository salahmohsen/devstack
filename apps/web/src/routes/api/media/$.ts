import { createFileRoute } from "@tanstack/react-router";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { isPublicAvatarObjectKey } from "@tsu-stack/core";

import { createLogger } from "@/shared/lib/evlog";

/**
 * Public read proxy for intentionally public media (profile avatars).
 *
 * When `MEDIA_PUBLIC_URL` is `${VITE_WEB_URL}/api/media`, `files.url(key)`
 * points here. Direct MinIO publicBaseUrl still works when the bucket has
 * an avatars GetObject policy — this route is the app-hosted alternative
 * so private objects never need a public bucket.
 *
 * Only `{userId}/avatars/*` keys are served. Resume sources, cover letters,
 * and other private prefixes return 404.
 */
export const Route = createFileRoute("/api/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const log = createLogger({
          operation: "web__media_public",
          method: "GET",
          path: "/api/media"
        });

        const key = (params._splat ?? "").replace(/^\/+/, "").trim();
        log.set({ hasKey: Boolean(key), keyPrefix: key.split("/").slice(0, 2).join("/") });

        if (!key || !isPublicAvatarObjectKey(key)) {
          log.set({ event: "media_public_forbidden", status: 404 });
          log.emit({ _forceKeep: true });
          return new Response("Not found", { status: 404 });
        }

        try {
          const files = createFiles();
          const object = await files.download(key);
          const contentType = object.type || contentTypeForAvatarKey(key);

          log.set({ event: "media_public_completed", status: 200 });
          log.emit();

          return new Response(object.stream(), {
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=31536000, immutable",
              "x-content-type-options": "nosniff"
            }
          });
        } catch (error) {
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "media_public_failed"
          });
          log.emit({ _forceKeep: true });
          return new Response("Not found", { status: 404 });
        }
      }
    }
  }
});

function contentTypeForAvatarKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}
