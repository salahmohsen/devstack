import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

import { type OrpcContextMediaBucket } from "@tsu-stack/core";

/**
 * Agent-local S3/media client (parity with packages/api createFiles).
 *
 * Required env (same as web/API media):
 * - S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY
 * - S3_BUCKET (default personal-hub), S3_REGION, S3_FORCE_PATH_STYLE
 * - MEDIA_PUBLIC_URL (optional)
 *
 * Fail closed when credentials/endpoint are missing.
 */
export type MediaBucketResult =
  | { ok: true; bucket: OrpcContextMediaBucket }
  | { ok: false; code: "STORAGE_NOT_CONFIGURED"; message: string };

function nonEmpty(value: string | undefined | null): string | null {
  const t = value?.trim();
  return t && t.length > 0 ? t : null;
}

export function createAgentMediaBucket(): MediaBucketResult {
  const endpoint = nonEmpty(process.env.S3_ENDPOINT);
  const accessKeyId = nonEmpty(process.env.S3_ACCESS_KEY);
  const secretAccessKey = nonEmpty(process.env.S3_SECRET_KEY);
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return {
      ok: false,
      code: "STORAGE_NOT_CONFIGURED",
      message:
        "S3 media is not configured on the agent (need S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY)"
    };
  }

  const forcePathStyleRaw = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  const forcePathStyle =
    forcePathStyleRaw === undefined || forcePathStyleRaw === ""
      ? true
      : forcePathStyleRaw === "true" || forcePathStyleRaw === "1";

  const files = new Files({
    adapter: s3({
      bucket: nonEmpty(process.env.S3_BUCKET) ?? "personal-hub",
      region: nonEmpty(process.env.S3_REGION) ?? "us-east-1",
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      publicBaseUrl: nonEmpty(process.env.MEDIA_PUBLIC_URL) ?? undefined
    })
  });

  return {
    ok: true,
    bucket: files as unknown as OrpcContextMediaBucket
  };
}
