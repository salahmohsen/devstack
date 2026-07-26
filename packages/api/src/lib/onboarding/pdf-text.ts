import { extractText, getDocumentProxy, getResolvedPDFJS } from "unpdf";

import { RESUME_SOURCE_MAX_BYTES } from "@tsu-stack/core";

/**
 * PDF → text for onboarding extract.
 *
 * ## Download path (used by extract router later — not implemented here)
 *
 * `OrpcContextMediaBucket` already exposes `get` (put/get/delete). Runtime wiring
 * in `apps/server/src/runtime-context.ts`:
 *
 * ```ts
 * // mediaBucket.get → files-sdk Files.download
 * const file = await rawFiles.download(key); // StoredFile
 * return { body: file.stream(), key: file.key }; // or null on miss
 * ```
 *
 * Materialise bytes after get:
 *
 * ```ts
 * const object = await context.mediaBucket.get(fullKey);
 * if (!object?.body) throw …; // not found
 * const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
 * const text = await extractTextFromPdf(bytes);
 * ```
 *
 * Alternative (same StoredFile from files-sdk): `await file.arrayBuffer()` then
 * `new Uint8Array(...)` — mediaBucket only surfaces the stream body today.
 */

/** Error codes for PDF text extraction (map to oRPC FILE_TOO_LARGE / EXTRACT_FAILED). */
export type PdfTextErrorCode = "FILE_TOO_LARGE" | "EXTRACT_FAILED";

export class PdfTextError extends Error {
  readonly code: PdfTextErrorCode;

  constructor(code: PdfTextErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "PdfTextError";
    this.code = code;
  }
}

/**
 * PDF.js (via unpdf) calls `Math.sumPrecise` for glyph/layout math. That helper is
 * not yet available in all Node runtimes, so polyfill a precise-enough sum.
 */
function ensureMathSumPrecise(): void {
  const math = Math as typeof Math & {
    sumPrecise?: (values: Iterable<number>) => number;
  };
  if (typeof math.sumPrecise === "function") return;

  // Kahan compensated sum — good enough for pdf.js font/layout arithmetic.
  math.sumPrecise = (values: Iterable<number>): number => {
    let sum = 0;
    let compensation = 0;
    for (const value of values) {
      const y = Number(value) - compensation;
      const total = sum + y;
      compensation = total - sum - y;
      sum = total;
    }
    return sum;
  };
}

/**
 * Extract plain text from a PDF byte buffer using unpdf
 * (`getDocumentProxy` + `extractText` with `mergePages: true`).
 *
 * Enforces {@link RESUME_SOURCE_MAX_BYTES} before parse. Throws
 * {@link PdfTextError} when the buffer is too large, unreadable, or yields no
 * non-whitespace text.
 */
export async function extractTextFromPdf(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > RESUME_SOURCE_MAX_BYTES) {
    throw new PdfTextError(
      "FILE_TOO_LARGE",
      `Resume source exceeds maximum size of ${RESUME_SOURCE_MAX_BYTES} bytes`
    );
  }

  if (bytes.byteLength === 0) {
    throw new PdfTextError("EXTRACT_FAILED", "Resume source PDF is empty");
  }

  ensureMathSumPrecise();

  let text: string;
  try {
    const pdfjs = await getResolvedPDFJS();
    // Silence non-fatal pdf.js noise (e.g. embedded font substitution).
    // VerbosityLevel.ERRORS === 0
    const errorsOnly = pdfjs.VerbosityLevel?.ERRORS ?? 0;

    // unpdf: getDocumentProxy(data) → PDFDocumentProxy; extractText(pdf, { mergePages: true }) → { text: string }
    const pdf = await getDocumentProxy(bytes, { verbosity: errorsOnly });
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch (error) {
    throw new PdfTextError("EXTRACT_FAILED", "Failed to extract text from resume PDF", {
      cause: error
    });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new PdfTextError(
      "EXTRACT_FAILED",
      "Resume PDF contains no extractable text (image-only or empty document)"
    );
  }

  return trimmed;
}
