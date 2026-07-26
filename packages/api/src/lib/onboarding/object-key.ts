import { resolveResumeSourceObjectKey } from "@tsu-stack/core";

/** Error codes for resume-source object key resolution (map to oRPC in extract/discard). */
export type ResumeSourceObjectKeyErrorCode = "INVALID_OBJECT_KEY";

export class ResumeSourceObjectKeyError extends Error {
  readonly code: ResumeSourceObjectKeyErrorCode;

  constructor(code: ResumeSourceObjectKeyErrorCode, message: string) {
    super(message);
    this.name = "ResumeSourceObjectKeyError";
    this.code = code;
  }
}

/**
 * Normalize a client-supplied object key to the full S3 key
 * `{userId}/resume-sources/...`, or throw {@link ResumeSourceObjectKeyError}.
 *
 * Accepts relative `resume-sources/…` or full `{userId}/resume-sources/…`.
 * Rejects empty keys, path traversal, `resumes/` (generated PDF tree), and
 * other users' prefixes — see {@link resolveResumeSourceObjectKey}.
 */
export function requireResumeSourceObjectKey(objectKey: string, userId: string): string {
  const fullKey = resolveResumeSourceObjectKey(objectKey, userId);
  if (fullKey == null) {
    throw new ResumeSourceObjectKeyError(
      "INVALID_OBJECT_KEY",
      "Object key must be a resume-sources path under the current user (relative or full). Generated resumes/ keys and other users are rejected."
    );
  }
  return fullKey;
}
