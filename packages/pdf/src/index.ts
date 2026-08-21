import { PdfEngineUnavailableError } from "#@/errors";
import { type CoverLetterPdfInput } from "#@/types";

export { PdfEngineUnavailableError, PdfRenderFailedError, type PdfErrorCode } from "#@/errors";
export { toRenderCvYaml } from "#@/map-rendercv-yaml";
export { renderResumePdfBytes } from "#@/spawn";
export type {
  CoverLetterPdfInput,
  PdfContact,
  ResumePdfInput,
  ResumePdfPortfolio,
  ResumePdfProfile
} from "#@/types";

export async function renderCoverLetterPdfBytes(_input: CoverLetterPdfInput): Promise<Uint8Array> {
  throw new PdfEngineUnavailableError();
}
