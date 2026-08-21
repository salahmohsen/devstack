import { PdfEngineUnavailableError } from "#@/errors";
import { type CoverLetterPdfInput, type ResumePdfInput } from "#@/types";

export { PdfEngineUnavailableError, PdfRenderFailedError, type PdfErrorCode } from "#@/errors";
export { toRenderCvYaml } from "#@/map-rendercv-yaml";
export type {
  CoverLetterPdfInput,
  PdfContact,
  ResumePdfInput,
  ResumePdfPortfolio,
  ResumePdfProfile
} from "#@/types";

export async function renderResumePdfBytes(_input: ResumePdfInput): Promise<Uint8Array> {
  throw new PdfEngineUnavailableError();
}

export async function renderCoverLetterPdfBytes(_input: CoverLetterPdfInput): Promise<Uint8Array> {
  throw new PdfEngineUnavailableError();
}
