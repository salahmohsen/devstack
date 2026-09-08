/**
 * Pure RenderCV doc-mapping entry — safe for browser bundles.
 *
 * Unlike the root entry (which pulls the node-only renderers), this module
 * exports only the pure YAML→doc mapping used by the onboarding resume-doc
 * preview. Kept in lockstep with `map-rendercv-yaml` by construction (same
 * `buildRenderCvDoc`) and by shared mapping tests.
 */
export { buildRenderCvDoc } from "#@/map-rendercv-yaml";
export type { PdfContact, ResumePdfInput, ResumePdfPortfolio, ResumePdfProfile } from "#@/types";
