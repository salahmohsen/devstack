import { type ApplicationStage } from "#@/application/types";

import { MAIL_SYSTEM_LABELS } from "./constants";
import { MAIL_SYSTEM_LABELS_SKIP_CRM, proposedStageFromSystemLabels } from "./crm-effects";

const CRM_MAIL_LABELS = new Set([
  "application",
  "application_status",
  "recruiter",
  "interview",
  "offer"
]);

export function mailHasSystemLabel(labels: readonly string[]): boolean {
  return labels.some((label) => (MAIL_SYSTEM_LABELS as readonly string[]).includes(label));
}

export function mailIsJobNotifier(labels: readonly string[]): boolean {
  return labels.includes("job_notifier") && !labels.some((label) => CRM_MAIL_LABELS.has(label));
}

export function mailIsCrmLabeled(labels: readonly string[]): boolean {
  return labels.some((label) => CRM_MAIL_LABELS.has(label));
}

export function mailIsUnsorted(labels: readonly string[]): boolean {
  return !mailHasSystemLabel(labels);
}

export type HubMailHit = {
  id: string;
  receivedAt: string | null;
  labels: string[];
  subject?: string | null;
  companyName?: string | null;
  title?: string | null;
  listingUrl?: string | null;
};

/** Newest first. */
export function sortMailNewestFirst<T extends { receivedAt: string | null }>(
  rows: readonly T[]
): T[] {
  return [...rows].toSorted((a, b) => {
    const aMs = a.receivedAt ? Date.parse(a.receivedAt) : 0;
    const bMs = b.receivedAt ? Date.parse(b.receivedAt) : 0;
    return bMs - aMs;
  });
}

/** Latest mail that can drive stage. Notifier / noise never win. */
export function latestCrmMail(hits: readonly HubMailHit[]): HubMailHit | null {
  for (const hit of sortMailNewestFirst(hits)) {
    if (mailIsCrmLabeled(hit.labels)) return hit;
  }
  return null;
}

export function latestMention(hits: readonly HubMailHit[]): HubMailHit | null {
  return sortMailNewestFirst(hits)[0] ?? null;
}

export function stageFromLatestCrmMail(hits: readonly HubMailHit[]): ApplicationStage | null {
  const latest = latestCrmMail(hits);
  if (!latest) return null;
  return proposedStageFromSystemLabels(latest.labels);
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function listingKey(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return `${parsed.hostname.replace(/^www\./i, "").toLowerCase()}${parsed.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return raw.toLowerCase();
  }
}

/** Same job = company + title, or the same listing URL. */
export function isSameHubJob(
  a: { companyName?: string | null; title?: string | null; listingUrl?: string | null },
  b: { companyName?: string | null; title?: string | null; listingUrl?: string | null }
): boolean {
  const aUrl = listingKey(a.listingUrl);
  const bUrl = listingKey(b.listingUrl);
  if (aUrl && bUrl && aUrl === bUrl) return true;
  const company = norm(a.companyName);
  const title = norm(a.title);
  if (!company || !title) return false;
  return company === norm(b.companyName) && title === norm(b.title);
}

export function isSkipCrmLabel(label: string): boolean {
  return (MAIL_SYSTEM_LABELS_SKIP_CRM as readonly string[]).includes(label);
}
