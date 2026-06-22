import { z } from "zod";

export const PORTFOLIO_IDENTITY_SOURCES = ["github", "manual", "conversation", "seed"] as const;
export type PortfolioIdentitySource = (typeof PORTFOLIO_IDENTITY_SOURCES)[number];

export const PORTFOLIO_IDENTITY_FACET_KEYS = ["headline", "bio", "focus_log", "narrative"] as const;
export type FacetKey = (typeof PORTFOLIO_IDENTITY_FACET_KEYS)[number];

export const portfolioIdentitySourceSchema = z.enum(PORTFOLIO_IDENTITY_SOURCES);
export const facetKeySchema = z.enum(PORTFOLIO_IDENTITY_FACET_KEYS);
