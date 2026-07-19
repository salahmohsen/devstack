import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export function createFiles() {
  return new Files({
    adapter: s3({
      bucket: ENV_WEB_SERVER.S3_BUCKET ?? "personal-hub",
      region: ENV_WEB_SERVER.S3_REGION ?? "us-east-1",
      endpoint: ENV_WEB_SERVER.S3_ENDPOINT,
      forcePathStyle: ENV_WEB_SERVER.S3_FORCE_PATH_STYLE ?? true,
      credentials: {
        accessKeyId: ENV_WEB_SERVER.S3_ACCESS_KEY ?? "",
        secretAccessKey: ENV_WEB_SERVER.S3_SECRET_KEY ?? ""
      },
      publicBaseUrl: ENV_WEB_SERVER.MEDIA_PUBLIC_URL
    })
  });
}
