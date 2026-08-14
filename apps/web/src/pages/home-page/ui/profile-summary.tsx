import { FlipSummary } from "@/shared/ui/flip-summary";
import { normalizePublicSummary } from "@/shared/ui/public-summary";

export { normalizePublicSummary };

/**
 * Public hero blurb under the name: flip by paragraph / line break
 * (rich HTML from TipTap is split on block boundaries into plain lines).
 */
export function ProfileSummary({
  summary,
  className,
  id
}: {
  summary: string;
  className?: string;
  id?: string;
}) {
  return <FlipSummary id={id} summary={summary} className={className} />;
}
