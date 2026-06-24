import { z } from "zod";

import {
  facetKeySchema,
  IdentityFacetSchema,
  portfolioIdentitySourceSchema,
  type IdentityFacet
} from "@tsu-stack/core/identity";
import { identityRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

type IdentityProposal = Awaited<ReturnType<typeof identityRepository.listProposals>>[number];

function toProposalOutput(p: IdentityProposal) {
  return {
    id: p.id,
    facetKey: p.facetKey,
    proposedValue: p.proposedValue,
    currentValue: p.currentValue,
    confidence: p.confidence,
    reason: p.reason,
    source: p.source,
    sourceRef: p.sourceRef,
    status: p.status,
    resolvedAt: p.resolvedAt?.toISOString() ?? null,
    resolvedBy: p.resolvedBy,
    createdAt: p.createdAt.toISOString()
  };
}

function toFacetOutput(f: IdentityFacet) {
  return {
    key: f.key,
    value: f.value,
    version: f.version,
    source: f.source,
    sourceRef: f.sourceRef,
    reason: f.reason,
    updatedBy: f.updatedBy,
    updatedAt: f.updatedAt.toISOString()
  };
}

const FacetKeyInput = z.object({ key: facetKeySchema });
const FacetValueInput = z.object({
  key: facetKeySchema,
  value: z.unknown(),
  source: portfolioIdentitySourceSchema.default("manual"),
  sourceRef: z.string().nullable().default(null),
  reason: z.string().min(1)
});

const ProposalActionInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["accept", "reject"])
});

const ProposalOutputSchema = z.object({
  id: z.string().uuid(),
  facetKey: facetKeySchema,
  proposedValue: z.unknown(),
  currentValue: z.unknown(),
  confidence: z.number(),
  reason: z.string(),
  source: portfolioIdentitySourceSchema,
  sourceRef: z.string().nullable(),
  status: z.enum(["open", "accepted", "rejected"]),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string()
});

const FacetOutputSchema = IdentityFacetSchema.extend({
  updatedAt: z.string()
});

const RefreshResponseSchema = z.object({ runId: z.string() });

export const identityRouter = {
  listFacets: publicProcedure
    .route({ description: "List all identity facets", method: "GET" })
    .output(z.array(FacetOutputSchema))
    .handler(async () => {
      const facets = await identityRepository.listFacets();
      return facets.map(toFacetOutput);
    }),

  getFacet: publicProcedure
    .route({ description: "Get one identity facet by key", method: "GET" })
    .input(FacetKeyInput)
    .output(FacetOutputSchema.nullable())
    .handler(async ({ input }) => {
      const f = await identityRepository.getFacet(input.key);
      return f ? toFacetOutput(f) : null;
    }),

  getRevisions: publicProcedure
    .route({ description: "Get revision history for one facet", method: "GET" })
    .input(FacetKeyInput.extend({ limit: z.number().int().min(1).max(200).default(50) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          facetKey: facetKeySchema,
          version: z.number().int(),
          value: z.unknown(),
          source: portfolioIdentitySourceSchema,
          sourceRef: z.string().nullable(),
          reason: z.string(),
          actor: z.string(),
          createdAt: z.string()
        })
      )
    )
    .handler(async ({ input }) => {
      const revs = await identityRepository.getRevisions(input.key, { limit: input.limit });
      return revs.map((r) => {
        return { ...r, createdAt: r.createdAt.toISOString() };
      });
    }),

  writeFacet: protectedProcedure
    .route({ description: "Write a new value to one identity facet", method: "POST" })
    .input(FacetValueInput)
    .output(FacetOutputSchema)
    .errors({
      VALIDATION_FAILED: {
        message: "Value did not match the facet's Zod schema",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      try {
        const { facet } = await identityRepository.writeFacet({
          key: input.key,
          value: input.value,
          source: input.source,
          sourceRef: input.sourceRef,
          reason: input.reason,
          actor: context.session.user.id
        });
        return toFacetOutput(facet);
      } catch (error) {
        if (error instanceof Error && error.message.includes("parse")) {
          throw errors.VALIDATION_FAILED();
        }
        throw error;
      }
    }),

  listProposals: publicProcedure
    .route({
      description: "List facet proposals, optionally filtered by status",
      method: "GET"
    })
    .input(
      z.object({
        status: z.enum(["open", "accepted", "rejected"]).optional()
      })
    )
    .output(z.array(ProposalOutputSchema))
    .handler(async ({ input }) => {
      const proposals = await identityRepository.listProposals({ status: input.status });
      return proposals.map(toProposalOutput);
    }),

  resolveProposal: protectedProcedure
    .route({ description: "Accept or reject a queued proposal", method: "POST" })
    .input(ProposalActionInput)
    .output(z.object({ ok: z.boolean() }))
    .errors({
      PROPOSAL_NOT_FOUND: { message: "Open proposal not found", status: 404 }
    })
    .handler(async ({ input, context, errors }) => {
      try {
        await identityRepository.resolveProposal({
          id: input.id,
          action: input.action,
          actor: context.session.user.id
        });
        return { ok: true };
      } catch (error) {
        if (error instanceof Error && error.message.includes("no open proposal")) {
          throw errors.PROPOSAL_NOT_FOUND();
        }
        throw error;
      }
    }),

  refresh: protectedProcedure
    .route({
      description: "Manually trigger a refresh-identity workflow run",
      method: "POST"
    })
    .input(z.object({ commitSha: z.string().optional() }))
    .output(RefreshResponseSchema)
    .errors({
      NOT_IMPLEMENTED: {
        message:
          "Manual refresh from the dashboard requires a follow-up that exposes c.env (and therefore c.env.MASTRA_DB) on the oRPC context.",
        status: 501
      }
    })
    .handler(async ({ errors }) => {
      throw errors.NOT_IMPLEMENTED();
    })
};
