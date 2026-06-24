import { and, desc, eq, sql } from "drizzle-orm";

import {
  validateFacetValue,
  type FacetKey,
  type IdentityFacet,
  type IdentityRevision,
  type PortfolioIdentitySource
} from "@tsu-stack/core/identity";

import { getDb, type WsDb } from "#@/index";
import {
  portfolioIdentityFacets,
  portfolioIdentityProposals,
  portfolioIdentityRevisions
} from "#@/schema/identity.schema";
import { type IdentityProposal } from "#@/types/identity";

type WriteFacetInput = {
  key: FacetKey;
  value: unknown;
  source: PortfolioIdentitySource;
  sourceRef?: string | null;
  reason: string;
  actor: string;
};

type WriteFacetResult = { facet: IdentityFacet; revision: IdentityRevision };

// Drizzle transaction handle for the per-request WebSocket db. Derived from
// WsDb so we don't need to re-export `fullRelations` from `#@/index`.
type WsDbTx = Parameters<WsDb["transaction"]>[0] extends (tx: infer T) => unknown ? T : never;

export const identityRepository = {
  async listFacets(): Promise<IdentityFacet[]> {
    const db = getDb();
    const rows = await db.select().from(portfolioIdentityFacets);
    return rows.map(toFacet);
  },

  async getFacet(key: FacetKey): Promise<IdentityFacet | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(portfolioIdentityFacets)
      .where(eq(portfolioIdentityFacets.key, key))
      .limit(1);
    return rows[0] ? toFacet(rows[0]) : null;
  },

  async writeFacet(input: WriteFacetInput, tx?: WsDbTx): Promise<WriteFacetResult> {
    const db = getDb();
    if (tx) {
      return writeFacetWithTx(input, tx);
    }
    return db.transaction((handle) => writeFacetWithTx(input, handle));
  },

  async getRevisions(
    facetKey: FacetKey,
    opts: { limit?: number } = {}
  ): Promise<IdentityRevision[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(portfolioIdentityRevisions)
      .where(eq(portfolioIdentityRevisions.facetKey, facetKey))
      .orderBy(desc(portfolioIdentityRevisions.version))
      .limit(opts.limit ?? 50);
    return rows.map(toRevision);
  },

  async listProposals(
    opts: { status?: "open" | "accepted" | "rejected"; limit?: number } = {}
  ): Promise<IdentityProposal[]> {
    const db = getDb();
    const where = opts.status ? eq(portfolioIdentityProposals.status, opts.status) : sql`true`;
    const rows = await db
      .select()
      .from(portfolioIdentityProposals)
      .where(where)
      .orderBy(desc(portfolioIdentityProposals.createdAt))
      .limit(opts.limit ?? 50);
    return rows.map(toProposal);
  },

  async createProposal(input: {
    facetKey: FacetKey;
    proposedValue: unknown;
    currentValue: unknown;
    confidence: number;
    reason: string;
    source: PortfolioIdentitySource;
    sourceRef?: string | null;
  }): Promise<IdentityProposal> {
    const db = getDb();
    const [row] = await db
      .insert(portfolioIdentityProposals)
      .values({
        facetKey: input.facetKey,
        proposedValue: input.proposedValue,
        currentValue: input.currentValue,
        confidence: input.confidence,
        reason: input.reason,
        source: input.source,
        sourceRef: input.sourceRef ?? null,
        status: "open"
      })
      .returning();
    if (!row) {
      throw new Error("identityRepository.createProposal: insert returned no row");
    }
    return toProposal(row);
  },

  async resolveProposal(input: {
    id: string;
    action: "accept" | "reject";
    actor: string;
  }): Promise<void> {
    const db = getDb();
    if (input.action === "reject") {
      await db
        .update(portfolioIdentityProposals)
        .set({ status: "rejected", resolvedAt: new Date(), resolvedBy: input.actor })
        .where(
          and(
            eq(portfolioIdentityProposals.id, input.id),
            eq(portfolioIdentityProposals.status, "open")
          )
        );
      return;
    }
    // accept: load proposal, write facet in a transaction, mark proposal accepted
    const [proposal] = await db
      .select()
      .from(portfolioIdentityProposals)
      .where(
        and(
          eq(portfolioIdentityProposals.id, input.id),
          eq(portfolioIdentityProposals.status, "open")
        )
      )
      .limit(1);
    if (!proposal) {
      throw new Error(`identityRepository.resolveProposal: no open proposal with id ${input.id}`);
    }
    await db.transaction(async (tx) => {
      await identityRepository.writeFacet(
        {
          key: proposal.facetKey as FacetKey,
          value: proposal.proposedValue,
          source: proposal.source as PortfolioIdentitySource,
          sourceRef: proposal.sourceRef,
          reason: `accepted proposal: ${proposal.reason}`,
          actor: input.actor
        },
        tx
      );
      await tx
        .update(portfolioIdentityProposals)
        .set({ status: "accepted", resolvedAt: new Date(), resolvedBy: input.actor })
        .where(eq(portfolioIdentityProposals.id, input.id));
    });
  }
};

/**
 * Shared write path for a single facet. Accepts either the per-request
 * `WsDb` or an in-flight `WsDbTx` so callers inside a `db.transaction(...)`
 * can join an existing transaction instead of opening a nested one. Drizzle
 * does not support nested transactions — `db.transaction(...)` inside an
 * already-open transaction starts an independent tx, defeating the
 * caller's atomicity assumption.
 */
async function writeFacetWithTx(
  input: WriteFacetInput,
  handle: WsDb | WsDbTx
): Promise<WriteFacetResult> {
  // Validation runs inside the transaction so a bad LLM output cannot
  // corrupt a facet row: if validateFacetValue throws, the transaction
  // aborts and neither the upsert nor the revision is persisted.
  const value = validateFacetValue(input.key, input.value);

  // SELECT ... FOR UPDATE (creates the row if missing).
  const existingRows = await handle
    .select()
    .from(portfolioIdentityFacets)
    .where(eq(portfolioIdentityFacets.key, input.key))
    .for("update")
    .limit(1);
  const existing = existingRows[0] ?? null;
  const nextVersion = (existing?.version ?? 0) + 1;

  if (existing) {
    await handle
      .update(portfolioIdentityFacets)
      .set({
        value,
        version: nextVersion,
        source: input.source,
        sourceRef: input.sourceRef ?? null,
        reason: input.reason,
        updatedBy: input.actor,
        updatedAt: new Date()
      })
      .where(eq(portfolioIdentityFacets.key, input.key));
  } else {
    await handle.insert(portfolioIdentityFacets).values({
      key: input.key,
      value,
      version: nextVersion,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      reason: input.reason,
      updatedBy: input.actor,
      updatedAt: new Date()
    });
  }

  const [revisionRow] = await handle
    .insert(portfolioIdentityRevisions)
    .values({
      facetKey: input.key,
      version: nextVersion,
      value,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      reason: input.reason,
      actor: input.actor
    })
    .returning();

  const [facetRow] = await handle
    .select()
    .from(portfolioIdentityFacets)
    .where(eq(portfolioIdentityFacets.key, input.key))
    .limit(1);

  if (!revisionRow || !facetRow) {
    throw new Error("identityRepository.writeFacet: missing row after write");
  }

  return { facet: toFacet(facetRow), revision: toRevision(revisionRow) };
}

function toFacet(row: typeof portfolioIdentityFacets.$inferSelect): IdentityFacet {
  return {
    key: row.key as FacetKey,
    value: row.value,
    version: row.version,
    source: row.source as PortfolioIdentitySource,
    sourceRef: row.sourceRef,
    reason: row.reason,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt
  };
}

function toRevision(row: typeof portfolioIdentityRevisions.$inferSelect): IdentityRevision {
  return {
    id: row.id,
    facetKey: row.facetKey as FacetKey,
    version: row.version,
    value: row.value,
    source: row.source as PortfolioIdentitySource,
    sourceRef: row.sourceRef,
    reason: row.reason,
    actor: row.actor,
    createdAt: row.createdAt
  };
}

function toProposal(row: typeof portfolioIdentityProposals.$inferSelect): IdentityProposal {
  return {
    id: row.id,
    facetKey: row.facetKey as FacetKey,
    proposedValue: row.proposedValue,
    currentValue: row.currentValue,
    confidence: row.confidence,
    reason: row.reason,
    source: row.source as PortfolioIdentitySource,
    sourceRef: row.sourceRef,
    status: row.status as "open" | "accepted" | "rejected",
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt
  };
}
