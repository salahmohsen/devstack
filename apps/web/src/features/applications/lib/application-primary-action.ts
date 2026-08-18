import { type ApplicationOutput } from "@tsu-stack/core";

import {
  canSendOutreach,
  getApplyPackageEntryState
} from "@/features/applications/lib/apply-package";

export type ApplicationPrimaryActionKind =
  | "prepare"
  | "add-jd"
  | "review"
  | "send"
  | "open-listing";

export type ApplicationPrimaryAction = {
  kind: ApplicationPrimaryActionKind;
  label: string;
};

/** Concise labels shared by board primary CTA, ⋮, and right-click menus. */
export const APPLICATION_PRIMARY_ACTION_LABELS = {
  prepare: "Prepare",
  addJd: "Add JD",
  review: "Review",
  send: "Send",
  openListing: "Open listing"
} as const;

export function listingUrlFor(app: ApplicationOutput): string | null {
  const listing = app.url?.trim() ? app.url.trim() : (app.applyUrl?.trim() ?? "");
  return listing.length > 0 ? listing : null;
}

export function hasJobDescription(app: ApplicationOutput): boolean {
  return Boolean(app.description?.trim());
}

/**
 * Stage-aware primary CTA for a tracked application card.
 * Priority: prepare/add JD → review draft → send outreach → open listing.
 */
export function getApplicationPrimaryAction(
  app: ApplicationOutput
): ApplicationPrimaryAction | null {
  const entryState = getApplyPackageEntryState(app);

  if (entryState === "none") {
    if (hasJobDescription(app)) {
      return { kind: "prepare", label: APPLICATION_PRIMARY_ACTION_LABELS.prepare };
    }
    return { kind: "add-jd", label: APPLICATION_PRIMARY_ACTION_LABELS.addJd };
  }

  if (entryState === "draft") {
    return { kind: "review", label: APPLICATION_PRIMARY_ACTION_LABELS.review };
  }

  if (canSendOutreach(app)) {
    return { kind: "send", label: APPLICATION_PRIMARY_ACTION_LABELS.send };
  }

  if (listingUrlFor(app)) {
    return { kind: "open-listing", label: APPLICATION_PRIMARY_ACTION_LABELS.openListing };
  }

  return null;
}
