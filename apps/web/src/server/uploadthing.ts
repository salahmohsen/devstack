import { UploadThingError, createUploadthing, type FileRouter } from "uploadthing/server";

import { auth } from "@tsu-stack/auth";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

const f = createUploadthing();

const requireAuth = async (req: Request) => {
  if (!ENV_WEB_SERVER.UPLOADTHING_TOKEN) {
    throw new UploadThingError("UploadThing is not configured on this server.");
  }
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    throw new UploadThingError("Unauthorized");
  }
  return { userId: session.user.id };
};

export const uploadRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1
    }
  })
    .middleware(async ({ req }) => {
      const { userId } = await requireAuth(req);
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.debug("Upload complete for userId:", metadata.userId);
      console.debug("file url", file.ufsUrl);
      return { uploadedBy: metadata.userId };
    })
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
