import { loadFontData, registerFont, type FontData, type FontEntry } from "pdfnative";

let latinFontEntries: Promise<readonly FontEntry[]> | undefined;

/**
 * Prefix that selects the embedded SemiBold face. Regular Noto has no U+E000,
 * so pdfnative's script splitter stays on `/F2` for the rest of the heading.
 */
export const PDF_HEADING_WEIGHT_MARK = "\uE000";

export function markPdfHeading(text: string): string {
  if (text.startsWith(PDF_HEADING_WEIGHT_MARK)) return text;
  return `${PDF_HEADING_WEIGHT_MARK}${text}`;
}

export function applyPdfHeadingWeights<T extends { type: string; text?: string }>(
  blocks: readonly T[]
): T[] {
  return blocks.map((block) => {
    if (block.type !== "heading" || typeof block.text !== "string") return block;
    return { ...block, text: markPdfHeading(block.text) };
  });
}

/**
 * Regular + SemiBold Noto Sans so tagged PDF/A can keep heading weight.
 * ISO 19005 forbids unembedded Helvetica; `/F2` is a 600 instance of the same VF.
 */
export function loadPdfALatinFontEntries(): Promise<readonly FontEntry[]> {
  latinFontEntries ??= (async () => {
    registerFont("latin", async () => {
      const data = await import("pdfnative/fonts/noto-sans-data.js");
      return data as unknown as FontData;
    });
    registerFont("latin-semibold", async () => {
      const data = await import("#@/lib/pdf/fonts/noto-sans-semibold-data");
      return data as unknown as FontData;
    });
    const [regular, semibold] = await Promise.all([
      loadFontData("latin"),
      loadFontData("latin-semibold")
    ]);
    if (!regular) {
      throw new Error("Failed to load pdfnative Noto Sans (latin) font data");
    }
    if (!semibold) {
      throw new Error("Failed to load Noto Sans SemiBold (latin) font data");
    }
    return [
      { fontData: regular, fontRef: "/F1", lang: "latin" },
      { fontData: semibold, fontRef: "/F2", lang: "latin-semibold" }
    ] as const;
  })();
  return latinFontEntries;
}
