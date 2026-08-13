import { loadFontData, registerFont, type FontData, type FontEntry } from "pdfnative";

let latinFontEntries: Promise<readonly FontEntry[]> | undefined;

/**
 * Load the bundled Noto Sans module so tagged PDF/A output embeds a Latin
 * font (ISO 19005 forbids unembedded Helvetica).
 */
export function loadPdfALatinFontEntries(): Promise<readonly FontEntry[]> {
  latinFontEntries ??= (async () => {
    registerFont("latin", async () => {
      const data = await import("pdfnative/fonts/noto-sans-data.js");
      return data as unknown as FontData;
    });
    const fontData = await loadFontData("latin");
    if (!fontData) {
      throw new Error("Failed to load pdfnative Noto Sans (latin) font data");
    }
    return [{ fontData, fontRef: "/F1", lang: "latin" }] as const;
  })();
  return latinFontEntries;
}
