import { Files } from "files-sdk";
import { r2, type R2Bucket } from "files-sdk/r2";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export function createFiles(binding: unknown) {
  return new Files({
    adapter: r2({
      binding: binding as R2Bucket,
      publicBaseUrl: ENV_WEB_SERVER.R2_PUBLIC_BASE_URL
    })
  });
}
