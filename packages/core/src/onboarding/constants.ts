/**
 * Client-relative key prefix for session resume-source PDFs.
 * Full S3 keys are `{userId}/resume-sources/{uuid}.pdf`.
 */
export const RESUME_SOURCE_KEY_PREFIX = "resume-sources/";

/** Max size for resume source PDFs (enforced in onboarding UI + extract). */
export const RESUME_SOURCE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Only PDF resume sources are supported in v1. */
export const RESUME_SOURCE_MIME = "application/pdf";
