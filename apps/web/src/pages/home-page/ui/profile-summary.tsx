import { isEmptyRichHtml } from "@/shared/ui/rich-html";

import { FlipSummary } from "@/pages/home-page/ui/flip-summary";

/**
 * Normalize portfolio summary for display: empty TipTap shells → null.
 */
export function normalizePublicSummary(raw: string | null | undefined): string | null {
  if (isEmptyRichHtml(raw)) return null;
  return raw!.trim();
}

/**
 * Public hero blurb under the name: flip by paragraph / line break
 * (rich HTML from TipTap is split on block boundaries into plain lines).
 */
export function ProfileSummary({ summary, className }: { summary: string; className?: string }) {
  return <FlipSummary summary={summary} className={className} />;
}
