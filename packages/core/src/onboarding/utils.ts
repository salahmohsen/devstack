import { CONTACT_TYPE_DEFAULT_ICONS, RESUME_SOURCE_KEY_PREFIX } from "#@/onboarding/constants";

type ContactType = keyof typeof CONTACT_TYPE_DEFAULT_ICONS;

/**
 * Normalize a client-supplied object key to the full S3 key
 * `{userId}/resume-sources/...`.
 *
 * Accepts:
 * - relative: `resume-sources/{uuid}.pdf`
 * - full: `{userId}/resume-sources/{uuid}.pdf`
 *
 * Rejects empty keys, path traversal (`..`), `resumes/` (generated PDF tree),
 * and keys under another user's prefix.
 *
 * @returns full object key, or `null` when invalid
 */
export function resolveResumeSourceObjectKey(objectKey: string, userId: string): string | null {
  if (typeof objectKey !== "string" || typeof userId !== "string") {
    return null;
  }

  const key = objectKey.trim().replace(/^\/+/, "");
  const uid = userId.trim();

  if (!key || !uid) {
    return null;
  }

  if (key.includes("..")) {
    return null;
  }

  // Generated resume tree must never be used as a session source.
  if (
    key === "resumes" ||
    key.startsWith("resumes/") ||
    key.includes("/resumes/") ||
    key.endsWith("/resumes")
  ) {
    return null;
  }

  const fullPrefix = `${uid}/${RESUME_SOURCE_KEY_PREFIX}`;

  if (key.startsWith(RESUME_SOURCE_KEY_PREFIX)) {
    // Relative form: resume-sources/... (prefix-only keys have no object name)
    if (key === RESUME_SOURCE_KEY_PREFIX) {
      return null;
    }
    return `${uid}/${key}`;
  }

  if (key.startsWith(fullPrefix)) {
    // Full form under this user; reject prefix-only (no object name)
    if (key === fullPrefix) {
      return null;
    }
    return key;
  }

  // Wrong user or unexpected prefix (e.g. other-user/resume-sources/...)
  return null;
}

/**
 * Assign stable temporary `clientId`s for draft rows (experiences/projects).
 * Existing non-empty `clientId` values are preserved.
 */
export function assignClientIds<T extends { clientId?: string | null }>(
  items: T[]
): Array<T & { clientId: string }> {
  return items.map((item) => {
    const existing = item.clientId?.trim();
    return {
      ...item,
      clientId: existing && existing.length > 0 ? existing : crypto.randomUUID()
    };
  });
}

function yearFromDateString(value?: string | null): number | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\d{4})/.exec(trimmed);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 1) {
    return null;
  }
  return year;
}

/**
 * Resolve a project year when extract omits it:
 * explicit year → end-date year → start-date year → current calendar year.
 */
export function normalizeResumeYear(input: {
  year?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
}): number {
  if (typeof input.year === "number" && Number.isFinite(input.year)) {
    const year = Math.trunc(input.year);
    if (year > 0) {
      return year;
    }
  }

  const toYear = yearFromDateString(input.toDate);
  if (toYear != null) {
    return toYear;
  }

  const fromYear = yearFromDateString(input.fromDate);
  if (fromYear != null) {
    return fromYear;
  }

  return new Date().getFullYear();
}

/**
 * Fill missing/empty contact icons from {@link CONTACT_TYPE_DEFAULT_ICONS}.
 * Existing non-empty icons are preserved.
 */
export function withContactDefaultIcons<
  T extends { type: string; value: string; icon?: string | null }
>(contacts: T[]): Array<T & { icon: string }> {
  return contacts.map((contact) => {
    const existing = contact.icon?.trim();
    if (existing && existing.length > 0) {
      return { ...contact, icon: existing };
    }

    const defaultIcon =
      CONTACT_TYPE_DEFAULT_ICONS[contact.type as ContactType] ?? CONTACT_TYPE_DEFAULT_ICONS.website;

    return { ...contact, icon: defaultIcon };
  });
}
