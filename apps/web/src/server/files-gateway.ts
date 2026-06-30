import { FilesError } from "files-sdk";
import { createFilesRouter } from "files-sdk/api";

import { files } from "@tsu-stack/api/lib/storage/index";
import { auth } from "@tsu-stack/auth";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

export const filesRouter = createFilesRouter({
  files,
  allowedOrigins: [ENV_WEB_ISOMORPHIC.VITE_WEB_URL],
  authorize: async ({ req }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      throw new FilesError("Unauthorized", "sign in");
    }
    return { keyPrefix: `${session.user.id}/` };
  }
});
