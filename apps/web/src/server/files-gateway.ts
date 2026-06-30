import { env } from "cloudflare:workers";
import { FilesError } from "files-sdk";
import { createFilesRouter } from "files-sdk/api";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { auth } from "@tsu-stack/auth";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export const filesRouter = createFilesRouter({
  files: () => createFiles(env.MEDIA_BUCKET),
  secret: ENV_WEB_SERVER.FILES_API_SECRET,
  allowedOrigins: [ENV_WEB_ISOMORPHIC.VITE_WEB_URL],
  authorize: async ({ req }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      throw new FilesError("Unauthorized", "sign in");
    }
    return { keyPrefix: `${session.user.id}/` };
  }
});
