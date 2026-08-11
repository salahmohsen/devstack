import { createFileRoute } from "@tanstack/react-router";

/**
 * Browsers / extensions often probe `/firebase-messaging-sw.js`.
 * Without this route the path matches `/$username` and triggers
 * portfolio RPC 404 noise (`pathUsername: firebase-messaging-sw.js`).
 * We do not use Firebase Cloud Messaging — return a quiet 404.
 */
export const Route = createFileRoute("/firebase-messaging-sw.js")({
  server: {
    handlers: {
      // evlog-map-disable-next-line wide-event, context -- static probe asset, deliberately silent
      GET: () =>
        new Response(null, {
          status: 404,
          headers: {
            "Cache-Control": "public, max-age=86400",
            "Content-Type": "application/javascript; charset=utf-8"
          }
        })
    }
  }
});
