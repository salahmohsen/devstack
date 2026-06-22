import { type FacetKey, type PortfolioIdentitySource } from "@tsu-stack/core/identity";

export type IdentityProposal = {
  id: string;
  facetKey: FacetKey;
  proposedValue: unknown;
  currentValue: unknown;
  confidence: number;
  reason: string;
  source: PortfolioIdentitySource;
  sourceRef: string | null;
  status: "open" | "accepted" | "rejected";
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
};
