import {
  ApplyPackageDraftSchema,
  type ApplicationOutput,
  type ApplyPackageDraft
} from "@tsu-stack/core";

/** Parse server draft JSON; null when missing or invalid. */
export function parseApplyPackageDraft(
  value: ApplicationOutput["applyPackageDraft"]
): ApplyPackageDraft | null {
  if (value == null) return null;
  const parsed = ApplyPackageDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export type ApplyPackageEntryState = "none" | "draft" | "accepted";

export type ApplyPackageEntryStateOptions = {
  /**
   * When false, never park on Review: orphan drafts and materials use the
   * accepted kit CTAs (Prepare again + materials).
   */
  reviewApplyKit?: boolean;
};

function hasAcceptedMaterials(app: ApplicationOutput): boolean {
  return [app.resumeId, app.coverLetterR2Key, app.coverLetterBody, app.outreachBody].some(Boolean);
}

/**
 * CTA state for Prepare / Review package / Materials.
 * Draft wins over accepted materials when Review apply kit is on (in-progress regenerate).
 * When Review is off, drafts never surface Review — materials/draft map to accepted CTAs.
 */
export function getApplyPackageEntryState(
  app: ApplicationOutput,
  options?: ApplyPackageEntryStateOptions
): ApplyPackageEntryState {
  const hasDraft = parseApplyPackageDraft(app.applyPackageDraft) != null;
  const hasMaterials = hasAcceptedMaterials(app);

  if (options?.reviewApplyKit === false) {
    // Materials = real kit. Orphan drafts without materials must not look
    // "accepted" (Prepare again) — that hid failed hub package runs.
    if (hasMaterials) return "accepted";
    return "none";
  }

  if (hasDraft) return "draft";
  if (hasMaterials) return "accepted";
  return "none";
}

export function canSendOutreach(app: ApplicationOutput): boolean {
  if (app.outcome != null) return false;
  if (!app.resumeId) return false;
  if (!app.recruiterEmail?.trim()) return false;
  if (!app.outreachSubject?.trim() || !app.outreachBody?.trim()) return false;
  return true;
}

export function coverLetterDownloadUrl(applicationId: string, view = false): string {
  const params = new URLSearchParams({ applicationId });
  if (view) params.set("view", "1");
  return `/api/cover-letter/download/?${params.toString()}`;
}

export function resumeDownloadUrl(resumeId: string, view = false): string {
  const params = new URLSearchParams({ id: resumeId });
  if (view) params.set("view", "1");
  return `/api/resume/download/?${params.toString()}`;
}
