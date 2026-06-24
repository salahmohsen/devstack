/**
 * Custom JSON-shape scorer for the `diff-facets` workflow step.
 *
 * Validates the structural correctness of the LLM's structured output
 * (`{ commitSha?, reason, currentFacets, proposals: [...] }`) without an
 * LLM judge. Catches the recurring failure modes documented in the test
 * plan:
 *   - #17 — model returns a bare array instead of `{ proposals: [...] }`
 *     ("json object" rejection by the OpenAI-compatible gateway)
 *   - #29 — model invents new facet keys outside the enum
 *     (`"headline" | "bio" | "focus_log" | "narrative"`)
 *   - `confidence` out of [0, 1] range
 *   - `proposedValue` is `null` / `undefined` / a primitive when the
 *     facet schema expects a record
 *
 * Scoring rubric (return value 0-1):
 *   1.0  — output passes every check
 *   0.5  — `proposals` is `[]` (legitimate "no changes" outcome)
 *   0.0  — output is not an object / `proposals` is missing
 *   between — proportional to the fraction of valid proposals among
 *     the total returned
 *
 * Sampling 100% (no LLM cost). The same `diffFacetsStep` execution
 * produces the same score on every run, so the workflow's SCORER_RUN
 * span carries the validation result alongside the structured output.
 */
import { createScorer } from "@mastra/core/evals";
import { z } from "zod";

const PROPOSAL_KEYS = ["headline", "bio", "focus_log", "narrative"] as const;
const ProposalKeySchema = z.enum(PROPOSAL_KEYS);

const StepOutputSchema = z.object({
  commitSha: z.string().optional(),
  reason: z.string(),
  currentFacets: z.record(z.string(), z.unknown()),
  proposals: z.array(
    z.object({
      key: ProposalKeySchema,
      proposedValue: z.unknown(),
      confidence: z.number().min(0).max(1),
      reason: z.string()
    })
  )
});

const PreprocessResultSchema = z.object({
  validProposals: z.number().int().min(0),
  totalProposals: z.number().int().min(0),
  reasons: z.array(z.string())
});

export const diffFacetsShapeScorer = createScorer({
  id: "diff-facets-shape",
  name: "Diff Facets JSON Shape",
  description:
    "Validates the diff-facets step output has the expected JSON structure: top-level object with `proposals: [...]`, each proposal has `key ∈ {headline, bio, focus_log, narrative}`, `confidence ∈ [0, 1]`, non-null `proposedValue`, and a non-empty `reason`. Catches the model returning a bare array, inventing facet keys, or omitting fields.",
  type: {
    input: z.unknown(),
    output: StepOutputSchema
  }
})
  .preprocess(({ run }) => {
    const raw = run.output;
    const reasons: string[] = [];

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      reasons.push(
        Array.isArray(raw)
          ? "Output is an array; expected an object with `proposals: [...]`."
          : `Output is ${raw === null ? "null" : typeof raw}; expected an object.`
      );
      return { validProposals: 0, totalProposals: 0, reasons };
    }

    const parsed = StepOutputSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        reasons.push(`${issue.path.length > 0 ? issue.path.join(".") : "root"}: ${issue.message}`);
      }
      const proposals = (raw as { proposals?: unknown }).proposals;
      const totalProposals = Array.isArray(proposals) ? proposals.length : 0;
      return { validProposals: 0, totalProposals, reasons };
    }

    const { proposals } = parsed.data;
    if (proposals.length === 0) {
      return { validProposals: 0, totalProposals: 0, reasons };
    }

    let valid = 0;
    for (const proposal of proposals) {
      if (proposal.proposedValue === null || proposal.proposedValue === undefined) {
        reasons.push(
          `proposal[${valid}].proposedValue is ${proposal.proposedValue === null ? "null" : "undefined"}; expected a non-null value.`
        );
        continue;
      }
      if (typeof proposal.proposedValue !== "object") {
        reasons.push(
          `proposal[${valid}].proposedValue is a primitive (${typeof proposal.proposedValue}); expected a record.`
        );
        continue;
      }
      if (proposal.reason.trim().length === 0) {
        reasons.push(`proposal[${valid}].reason is empty.`);
        continue;
      }
      valid += 1;
    }

    return { validProposals: valid, totalProposals: proposals.length, reasons };
  })
  .generateScore(({ results }) => {
    const parsed = PreprocessResultSchema.parse(results.preprocessStepResult);
    if (parsed.totalProposals === 0) {
      // "No changes proposed" is a legitimate outcome. Score 0.5 to
      // signal "structured but empty" vs. "broken" (which would be 0.0).
      return parsed.reasons.length === 0 ? 0.5 : 0.0;
    }
    return parsed.validProposals / parsed.totalProposals;
  })
  .generateReason(({ results, score }) => {
    const parsed = PreprocessResultSchema.parse(results.preprocessStepResult);
    if (parsed.totalProposals === 0) {
      return parsed.reasons.length === 0
        ? "No proposals returned. Legitimate 'no changes' outcome."
        : `No valid proposals: ${parsed.reasons.join(" ")}`;
    }
    return `${parsed.validProposals}/${parsed.totalProposals} proposals are structurally valid (score=${score.toFixed(2)}).${
      parsed.reasons.length > 0 ? ` Issues: ${parsed.reasons.join(" ")}` : ""
    }`;
  });
