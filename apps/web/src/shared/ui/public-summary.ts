import { isEmptyRichHtml } from "@/shared/ui/rich-html";

/** Normalize portfolio summary for display: empty TipTap shells → null. */
export function normalizePublicSummary(raw: string | null | undefined): string | null {
  if (isEmptyRichHtml(raw)) return null;
  return raw!.trim();
}
