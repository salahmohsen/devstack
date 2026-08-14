/** Client-relative key prefix under the gateway `{userId}/` scope. */
export const AVATAR_KEY_PREFIX = "avatars/" as const;

/**
 * Full object key shape written by the public image uploader (profile photo and
 * project logos): `{userId}/avatars/{uuid}.{ext}`
 *
 * Only these keys are safe for anonymous public read (MinIO policy / `/api/media`).
 */
const PUBLIC_AVATAR_OBJECT_KEY_RE = /^[^/]+\/avatars\/[A-Za-z0-9._-]+\.(?:jpe?g|png|gif|webp)$/i;

export function isPublicAvatarObjectKey(key: string): boolean {
  return PUBLIC_AVATAR_OBJECT_KEY_RE.test(key.trim());
}

/**
 * Pull a full avatar object key from a stored `user.image` value.
 * Accepts bare keys or absolute MinIO / app-proxy URLs that end with the key.
 */
export function extractAvatarObjectKey(image: string | null | undefined): string | null {
  const raw = image?.trim() ?? "";
  if (!raw) return null;
  if (isPublicAvatarObjectKey(raw)) return raw;

  try {
    const path = raw.includes("://") ? new URL(raw).pathname : raw;
    const segments = path.split("/").filter(Boolean);
    // path-style: /{bucket}/{userId}/avatars/{file}  or  /api/media/{userId}/avatars/{file}
    for (let i = 0; i < segments.length - 2; i++) {
      if (segments[i + 1] === "avatars") {
        const key = `${segments[i]}/avatars/${segments[i + 2]}`;
        if (isPublicAvatarObjectKey(key)) return key;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Client-relative key for files-sdk gateway (`avatars/…` under `{userId}/` prefix).
 * Use for `files.delete` after replace/clear — not the full S3 object key.
 */
export function extractAvatarClientKey(image: string | null | undefined): string | null {
  const full = extractAvatarObjectKey(image);
  if (!full) return null;
  const marker = `/${AVATAR_KEY_PREFIX}`;
  const idx = full.indexOf(marker);
  if (idx === -1) {
    return full.startsWith(AVATAR_KEY_PREFIX) ? full : null;
  }
  return full.slice(idx + 1);
}
