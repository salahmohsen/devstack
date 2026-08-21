export type PdfErrorCode = "PDF_ENGINE_UNAVAILABLE" | "PDF_RENDER_FAILED";

export class PdfEngineUnavailableError extends Error {
  readonly code: PdfErrorCode = "PDF_ENGINE_UNAVAILABLE";

  constructor(message = "PDF engine is unavailable (rendercv or typst missing on PATH)") {
    super(message);
    this.name = "PdfEngineUnavailableError";
  }
}

export class PdfRenderFailedError extends Error {
  readonly code: PdfErrorCode = "PDF_RENDER_FAILED";

  constructor(message = "PDF render failed") {
    super(message);
    this.name = "PdfRenderFailedError";
  }
}
