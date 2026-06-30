import { Files } from "files-sdk";
import { r2 } from "files-sdk/r2";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export const files = new Files({
  adapter: r2({
    accountId: ENV_WEB_SERVER.R2_ACCOUNT_ID,
    accessKeyId: ENV_WEB_SERVER.R2_ACCESS_KEY_ID,
    secretAccessKey: ENV_WEB_SERVER.R2_SECRET_ACCESS_KEY,
    bucket: ENV_WEB_SERVER.R2_BUCKET,
    publicBaseUrl: ENV_WEB_SERVER.R2_PUBLIC_BASE_URL
  })
});
