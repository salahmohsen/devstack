import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

import { uploadRouter } from "@/server/uploadthing";

const handlers = createRouteHandler({ router: uploadRouter });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-uploadthing-version, x-uploadthing-package, b3, traceparent, x-uploadthing-api-key"
};

export const Route = createFileRoute("/api/uploadthing/")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: ({ request }) => {
        if (!ENV_WEB_SERVER.UPLOADTHING_TOKEN) {
          return new Response(
            JSON.stringify({ error: "UploadThing is not configured on this server." }),
            { status: 503, headers: { "content-type": "application/json", ...corsHeaders } }
          );
        }
        return handlers({ request });
      },
      POST: ({ request }) => {
        if (!ENV_WEB_SERVER.UPLOADTHING_TOKEN) {
          return new Response(
            JSON.stringify({ error: "UploadThing is not configured on this server." }),
            { status: 503, headers: { "content-type": "application/json", ...corsHeaders } }
          );
        }
        return handlers({ request });
      }
    }
  }
});
