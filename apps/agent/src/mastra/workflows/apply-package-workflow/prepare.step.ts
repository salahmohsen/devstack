import { createStep } from "@mastra/core/workflows";

import {
  ApplyPackagePortfolioSnapshotSchema,
  ApplyPackageWorkflowInputSchema,
  type ApplyPackageWorkflowInput
} from "@tsu-stack/core";

import {
  ApplyPackageWorkflowStateSchema,
  type ApplyPackageWorkflowState
} from "#@/mastra/workflows/apply-package-workflow/workflow-state";

/**
 * Ground job description text for rewrite/letter steps.
 * Prefer listing page text when present; always cap at 14_000 chars.
 */
export function descriptionUsed(input: ApplyPackageWorkflowInput): {
  descriptionUsed: string;
  listingFetched: boolean;
  listingUrl: string | null;
} {
  const listingText = input.listingPageText?.trim() ?? "";
  const jobDesc = input.job.description?.trim() ?? "";
  const fromListing = input.listingUrl?.trim();
  const fromJobUrl = input.job.url?.trim();
  const listingUrl =
    fromListing && fromListing.length > 0
      ? fromListing
      : fromJobUrl && fromJobUrl.length > 0
        ? fromJobUrl
        : null;
  if (listingText.length > 0) {
    const combined =
      jobDesc.length > 0 ? `${jobDesc}\n\n--- Listing page ---\n${listingText}` : listingText;
    return {
      descriptionUsed: combined.slice(0, 14_000),
      listingFetched: true,
      listingUrl
    };
  }
  return {
    descriptionUsed: jobDesc.slice(0, 14_000),
    listingFetched: false,
    listingUrl
  };
}

export const prepareContext = createStep({
  id: "prepare-context",
  description: "Ground jobContext and normalize portfolio for apply-package rewrite steps",
  inputSchema: ApplyPackageWorkflowInputSchema,
  outputSchema: ApplyPackageWorkflowStateSchema,
  execute: async ({ inputData }): Promise<ApplyPackageWorkflowState> => {
    const ctx = descriptionUsed(inputData);
    const portfolio = ApplyPackagePortfolioSnapshotSchema.parse(inputData.portfolio);

    return {
      applicationId: inputData.applicationId,
      jobContext: {
        title: inputData.job.title,
        companyName: inputData.job.companyName,
        descriptionUsed: ctx.descriptionUsed,
        listingFetched: ctx.listingFetched,
        listingUrl: ctx.listingUrl
      },
      jobBrief: {
        title: inputData.job.title,
        companyName: inputData.job.companyName,
        descriptionUsed: ctx.descriptionUsed,
        location: inputData.job.location ?? null,
        salaryRange: inputData.job.salaryRange ?? null,
        notes: inputData.job.notes ?? null
      },
      portfolio,
      llm: inputData.llm,
      experienceRewrites: [],
      projectRewrites: []
    };
  }
});
