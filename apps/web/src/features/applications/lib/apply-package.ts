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

/**
 * CTA state for Prepare / Review package / Materials.
 * Draft wins over accepted materials (in-progress regenerate draft).
 */
export function getApplyPackageEntryState(app: ApplicationOutput): ApplyPackageEntryState {
  if (parseApplyPackageDraft(app.applyPackageDraft)) return "draft";
  if (app.resumeId || app.coverLetterR2Key || app.coverLetterBody || app.outreachBody) {
    return "accepted";
  }
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
